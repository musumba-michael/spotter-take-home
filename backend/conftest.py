import os
import sys

# Set test environment variables BEFORE any Django code runs
# These override values from .env and must be strings
os.environ["DB_ENGINE"] = "django.db.backends.sqlite3"
os.environ["DB_NAME"] = ":memory:"
os.environ["DB_HOST"] = ""
os.environ["DB_PORT"] = ""
os.environ["DB_USER"] = ""
os.environ["DB_PASSWORD"] = ""
os.environ["DJANGO_SETTINGS_MODULE"] = "core.settings"
os.environ["DJANGO_SECRET_KEY"] = "test-secret-key"
os.environ["DJANGO_DEBUG"] = "1"
os.environ["ALLOWED_HOSTS"] = "localhost,127.0.0.1,testserver"
os.environ["MAPBOX_ACCESS_TOKEN"] = "test-mapbox-token"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"

# pytest-django will handle Django setup, so we don't call django.setup() here
