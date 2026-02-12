import uuid

from django.contrib import admin, messages
from django.core.files.storage import default_storage
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.urls import path

from .forms import FuelStationUploadForm
from .models import FuelStation, FuelStationUploadJob
from .tasks import process_fuel_station_csv


@admin.register(FuelStation)
class FuelStationAdmin(admin.ModelAdmin):
    list_display = ("truckstop_name", "city", "state", "retail_price", "updated_at")
    search_fields = ("truckstop_name", "city", "state", "address")
    list_filter = ("state",)

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path("upload-csv/", self.admin_site.admin_view(self.upload_csv), name="fuelstation-upload-csv"),
            path(
                "upload-status/<int:job_id>/",
                self.admin_site.admin_view(self.upload_status),
                name="fuelstation-upload-status",
            ),
            path(
                "upload-status/<int:job_id>/json/",
                self.admin_site.admin_view(self.upload_status_json),
                name="fuelstation-upload-status-json",
            ),
        ]
        return custom_urls + urls

    def upload_csv(self, request):
        if request.method == "POST":
            form = FuelStationUploadForm(request.POST, request.FILES)
            if form.is_valid():
                file_obj = form.cleaned_data["csv_file"]
                unique_name = f"uploads/fuelstations/{uuid.uuid4().hex}_{file_obj.name}"
                saved_path = default_storage.save(unique_name, file_obj)
                job = FuelStationUploadJob.objects.create(
                    file_path=saved_path,
                    original_filename=file_obj.name,
                )
                process_fuel_station_csv.delay(job.id)
                messages.info(request, "Upload queued. Progress will appear on the status page.")
                return redirect(f"../upload-status/{job.id}/")
        else:
            form = FuelStationUploadForm()

        context = {
            "form": form,
            "title": "Upload Fuel Stations CSV",
        }
        return render(request, "admin/route_planner/fuelstation/upload_csv.html", context)

    def upload_status(self, request, job_id: int):
        job = FuelStationUploadJob.objects.get(pk=job_id)
        context = {
            "title": "Fuel Stations Upload Status",
            "job": job,
        }
        return render(request, "admin/route_planner/fuelstation/upload_status.html", context)

    def upload_status_json(self, request, job_id: int):
        job = FuelStationUploadJob.objects.get(pk=job_id)
        percent = 0
        if job.total_rows > 0:
            percent = int((job.processed_rows / job.total_rows) * 100)

        return JsonResponse(
            {
                "status": job.status,
                "total_rows": job.total_rows,
                "processed_rows": job.processed_rows,
                "created_count": job.created_count,
                "updated_count": job.updated_count,
                "geocoded_count": job.geocoded_count,
                "failed_count": job.failed_count,
                "percent": percent,
                "error_log": job.error_log,
                "started_at": job.started_at.isoformat() if job.started_at else None,
                "finished_at": job.finished_at.isoformat() if job.finished_at else None,
            }
        )
