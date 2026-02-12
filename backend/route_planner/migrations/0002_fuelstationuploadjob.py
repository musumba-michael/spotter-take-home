from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("route_planner", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="FuelStationUploadJob",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("file_path", models.CharField(max_length=500)),
                ("original_filename", models.CharField(max_length=255)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("running", "Running"),
                            ("completed", "Completed"),
                            ("failed", "Failed"),
                        ],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("total_rows", models.IntegerField(default=0)),
                ("processed_rows", models.IntegerField(default=0)),
                ("created_count", models.IntegerField(default=0)),
                ("updated_count", models.IntegerField(default=0)),
                ("geocoded_count", models.IntegerField(default=0)),
                ("failed_count", models.IntegerField(default=0)),
                ("error_log", models.TextField(blank=True)),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
