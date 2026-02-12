import pytest
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from route_planner.models import FuelStation, FuelStationUploadJob
from route_planner.services import GeocodeResult
from route_planner.tasks import process_fuel_station_csv


@pytest.mark.django_db
def test_process_fuel_station_csv_creates_stations(tmp_path, monkeypatch, settings):
    settings.MEDIA_ROOT = tmp_path

    csv_content = (
        "OPIS Truckstop ID,Truckstop Name,Address,City,State,Rack ID,Retail Price\n"
        "1,Stop One,123 Main St,Testville,TX,10,3.50\n"
        "2,Stop Two,456 Main St,Testville,TX,11,3.60\n"
    )

    saved_path = default_storage.save("uploads/test.csv", ContentFile(csv_content.encode("utf-8")))
    job = FuelStationUploadJob.objects.create(file_path=saved_path, original_filename="test.csv")

    def fake_geocode(_query: str):
        return GeocodeResult(latitude=30.0, longitude=-97.0, place_name="Test", is_us=True)

    monkeypatch.setattr("route_planner.tasks.geocode_location", fake_geocode)

    process_fuel_station_csv(job.id)

    job.refresh_from_db()
    assert job.status == FuelStationUploadJob.STATUS_COMPLETED
    assert job.created_count == 2
    assert job.failed_count == 0
    assert FuelStation.objects.count() == 2
    assert FuelStation.objects.filter(latitude__isnull=False, longitude__isnull=False).count() == 2
