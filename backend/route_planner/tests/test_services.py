import pytest

from route_planner.services import (
    StationOnRoute,
    choose_start_price,
    haversine_miles,
    plan_fuel_stops,
    simplify_route_points,
)


def test_haversine_zero_distance():
    assert haversine_miles((0.0, 0.0), (0.0, 0.0)) == 0.0


def test_simplify_route_points_removes_close_points():
    points = [(0.0, 0.0), (0.02, 0.0), (0.3, 0.0)]
    simplified = simplify_route_points(points, min_miles=10.0)
    assert simplified[0] == points[0]
    assert simplified[-1] == points[-1]
    assert len(simplified) == 2


def test_choose_start_price_prefers_cheapest_at_same_marker():
    stations = [
        StationOnRoute(
            station_data={"opis_id": 1},
            price=4.0,
            mile_marker=2.0,
            distance_to_route=0.5,
            latitude=0.0,
            longitude=0.0,
        ),
        StationOnRoute(
            station_data={"opis_id": 2},
            price=3.0,
            mile_marker=2.0,
            distance_to_route=0.3,
            latitude=0.0,
            longitude=0.0,
        ),
        StationOnRoute(
            station_data={"opis_id": 3},
            price=2.5,
            mile_marker=10.0,
            distance_to_route=0.2,
            latitude=0.0,
            longitude=0.0,
        ),
    ]

    start = choose_start_price(stations, max_start_distance_miles=5.0)
    assert start.price == 3.0
    assert start.virtual is True


@pytest.mark.parametrize("total_miles, expected_cost", [(250.0, 105.0)])
def test_plan_fuel_stops_basic(total_miles, expected_cost):
    start_price = StationOnRoute(
        station_data={"opis_id": 1},
        price=5.0,
        mile_marker=0.0,
        distance_to_route=0.0,
        latitude=0.0,
        longitude=0.0,
        virtual=True,
    )
    stations = [
        StationOnRoute(
            station_data={"opis_id": 2},
            price=4.0,
            mile_marker=100.0,
            distance_to_route=0.2,
            latitude=0.0,
            longitude=0.0,
        ),
        StationOnRoute(
            station_data={"opis_id": 3},
            price=3.0,
            mile_marker=200.0,
            distance_to_route=0.2,
            latitude=0.0,
            longitude=0.0,
        ),
    ]

    stops, total_cost, total_gallons = plan_fuel_stops(
        stations,
        total_miles=total_miles,
        mpg=10.0,
        max_range_miles=150.0,
        start_price=start_price,
    )

    assert total_cost == expected_cost
    assert total_gallons == 25.0
    assert len(stops) == 3
