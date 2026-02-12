import pytest
from rest_framework.test import APIClient

from route_planner.services import RoutePlannerError


@pytest.mark.django_db
def test_route_plan_success(monkeypatch):
    def fake_compute(**_kwargs):
        return {
            "start": {"query": "A", "place_name": "A", "latitude": 0, "longitude": 0},
            "end": {"query": "B", "place_name": "B", "latitude": 1, "longitude": 1},
            "route": {
                "distance_miles": 10.0,
                "duration_seconds": 100.0,
                "geometry": "poly",
                "geometry_format": "polyline6",
            },
            "fueling": {"max_range_miles": 500, "mpg": 10.0, "total_cost": 0, "total_gallons": 0, "fuel_stops": []},
            "assumptions": [],
        }

    monkeypatch.setattr("route_planner.views.compute_route_plan", fake_compute)
    client = APIClient()
    response = client.post(
        "/api/v1/route-plan/",
        {"start_location": "Austin, TX", "end_location": "Dallas, TX"},
        format="json",
    )

    assert response.status_code == 200
    assert response.data["route"]["distance_miles"] == 10.0


@pytest.mark.django_db
def test_route_plan_handles_domain_error(monkeypatch):
    def fake_compute(**_kwargs):
        raise RoutePlannerError("No route found")

    monkeypatch.setattr("route_planner.views.compute_route_plan", fake_compute)
    client = APIClient()
    response = client.post(
        "/api/v1/route-plan/",
        {"start_location": "Austin, TX", "end_location": "Dallas, TX"},
        format="json",
    )

    assert response.status_code == 400
    assert response.data["detail"] == "No route found"


@pytest.mark.django_db
def test_route_plan_validation_error():
    client = APIClient()
    response = client.post("/api/v1/route-plan/", {"start_location": ""}, format="json")

    assert response.status_code == 400
    assert "end_location" in response.data
