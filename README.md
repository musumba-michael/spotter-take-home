## Running the project

1. Install Docker.
2. From the repo root, run `docker compose build`.
3. Run `docker compose watch`.
4. In a separate terminal, run `docker compose exec backend python manage.py createsuperuser`.
5. Log into the Django admin at http://localhost:8001/admin/ and upload the fuel-prices-for-be-assessment file.
6. Open http://localhost:3001 and enter the start and end locations.

Link to postman collection https://.postman.co/workspace/My-Workspace~72723324-dde2-4b7f-8a9e-9bf400532f3e/request/10646261-2f2d08b7-fe36-4165-88b7-f173c5ce8f60?action=share&creator=10646261&ctx=documentation

Link to loom video: https://www.loom.com/share/7d93585d2f134ee58f0016b6d8883d32