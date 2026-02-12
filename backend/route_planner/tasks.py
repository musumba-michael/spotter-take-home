import csv
from decimal import Decimal
from io import TextIOWrapper
from typing import List

from celery import shared_task
from django.core.files.storage import default_storage
from django.utils import timezone

from .models import FuelStation, FuelStationUploadJob
from .services import geocode_location, invalidate_station_cache


@shared_task
def process_fuel_station_csv(job_id: int) -> None:
    job = FuelStationUploadJob.objects.get(pk=job_id)
    job.status = FuelStationUploadJob.STATUS_RUNNING
    job.started_at = timezone.now()
    job.save(update_fields=["status", "started_at", "updated_at"])

    error_messages: List[str] = []
    created = 0
    updated = 0
    geocoded = 0
    failed = 0
    processed = 0

    try:
        with default_storage.open(job.file_path, "rb") as file_obj:
            wrapper = TextIOWrapper(file_obj, encoding="utf-8")
            reader = csv.DictReader(wrapper)
            total_rows = sum(1 for _ in reader)

        job.total_rows = total_rows
        job.save(update_fields=["total_rows", "updated_at"])

        with default_storage.open(job.file_path, "rb") as file_obj:
            wrapper = TextIOWrapper(file_obj, encoding="utf-8")
            reader = csv.DictReader(wrapper)

            for index, row in enumerate(reader, start=1):
                try:
                    opis_id = int(row["OPIS Truckstop ID"].strip())
                    truckstop_name = row["Truckstop Name"].strip()
                    address = row["Address"].strip()
                    city = row["City"].strip()
                    state = row["State"].strip()
                    rack_id = int(row["Rack ID"].strip())
                    retail_price = Decimal(row["Retail Price"].strip())

                    defaults = {"retail_price": retail_price}
                    station, was_created = FuelStation.objects.update_or_create(
                        opis_id=opis_id,
                        truckstop_name=truckstop_name,
                        address=address,
                        city=city,
                        state=state,
                        rack_id=rack_id,
                        defaults=defaults,
                    )
                    if was_created:
                        created += 1
                    else:
                        updated += 1

                    if station.latitude is None or station.longitude is None:
                        query = f"{address}, {city}, {state}"
                        try:
                            result = geocode_location(query)
                        except Exception as exc:
                            failed += 1
                            error_messages.append(f"Row {index}: geocoding failed: {exc}")
                        else:
                            station.latitude = result.latitude
                            station.longitude = result.longitude
                            station.save(update_fields=["latitude", "longitude"])
                            geocoded += 1

                except Exception as exc:
                    failed += 1
                    error_messages.append(f"Row {index}: {exc}")

                processed += 1
                if processed % 100 == 0:
                    job.processed_rows = processed
                    job.created_count = created
                    job.updated_count = updated
                    job.geocoded_count = geocoded
                    job.failed_count = failed
                    job.save(
                        update_fields=[
                            "processed_rows",
                            "created_count",
                            "updated_count",
                            "geocoded_count",
                            "failed_count",
                            "updated_at",
                        ]
                    )

        job.processed_rows = processed
        job.created_count = created
        job.updated_count = updated
        job.geocoded_count = geocoded
        job.failed_count = failed
        job.error_log = "\n".join(error_messages)
        job.status = FuelStationUploadJob.STATUS_COMPLETED
        job.finished_at = timezone.now()
        job.save(
            update_fields=[
                "processed_rows",
                "created_count",
                "updated_count",
                "geocoded_count",
                "failed_count",
                "error_log",
                "status",
                "finished_at",
                "updated_at",
            ]
        )
        invalidate_station_cache()

    except Exception as exc:
        error_messages.append(f"Job failed: {exc}")
        job.error_log = "\n".join(error_messages)
        job.status = FuelStationUploadJob.STATUS_FAILED
        job.finished_at = timezone.now()
        job.save(update_fields=["error_log", "status", "finished_at", "updated_at"])
        raise
