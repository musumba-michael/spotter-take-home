import hashlib
import json
import math
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

from django.conf import settings
from django.core.cache import cache

from .models import FuelStation


@dataclass
class GeocodeResult:
    latitude: float
    longitude: float
    place_name: str
    is_us: bool


@dataclass
class RouteResult:
    distance_miles: float
    duration_seconds: float
    geometry: Any
    geometry_format: str
    coordinates: List[Tuple[float, float]]


@dataclass
class StationOnRoute:
    station_data: Optional[Dict[str, Any]]
    price: float
    mile_marker: float
    distance_to_route: float
    latitude: float
    longitude: float
    virtual: bool = False


class RoutePlannerError(Exception):
    pass


def _fetch_json(url: str, timeout: int = 20) -> Dict[str, Any]:
    # nosec: URL is constructed from static settings (MAPBOX_*) and validated below
    # Validate URL scheme to prevent file:// or other unsafe schemes
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise RoutePlannerError("Invalid URL scheme. Only http/https are allowed.")

    request = urllib.request.Request(url, headers={"User-Agent": "spotter-route-planner"})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        payload = response.read().decode("utf-8")
    return json.loads(payload)


def _is_us_context(feature: Dict[str, Any]) -> bool:
    context = feature.get("context", [])
    for item in context:
        if item.get("id", "").startswith("country") and item.get("short_code") == "us":
            return True
    return False


def geocode_location(query: str) -> GeocodeResult:
    cache_key = f"geocode:{query.strip().lower()}"
    cached = cache.get(cache_key)
    if cached:
        return GeocodeResult(**cached)

    encoded_query = urllib.parse.quote(query)
    base_url = getattr(settings, "MAPBOX_GEOCODING_URL", "https://api.mapbox.com/geocoding/v5/mapbox.places")
    url = (
        f"{base_url}/{encoded_query}.json?access_token={settings.MAPBOX_ACCESS_TOKEN}"
        "&limit=1&country=us&autocomplete=false"
    )
    data = _fetch_json(url)
    features = data.get("features", [])
    if not features:
        raise RoutePlannerError("No geocoding result found.")

    feature = features[0]
    center = feature.get("center") or []
    if len(center) != 2:
        raise RoutePlannerError("Invalid geocoding response.")

    result = GeocodeResult(
        latitude=center[1],
        longitude=center[0],
        place_name=feature.get("place_name", query),
        is_us=_is_us_context(feature),
    )
    cache.set(cache_key, result.__dict__, timeout=60 * 60 * 24 * 7)
    return result


def get_route(start: Tuple[float, float], end: Tuple[float, float]) -> RouteResult:
    base_url = getattr(settings, "MAPBOX_DIRECTIONS_URL", "https://api.mapbox.com/directions/v5/mapbox/driving")
    url = (
        f"{base_url}/{start[1]},{start[0]};{end[1]},{end[0]}"
        f"?geometries=polyline6&overview=full&access_token={settings.MAPBOX_ACCESS_TOKEN}"
    )
    data = _fetch_json(url)
    routes = data.get("routes", [])
    if not routes:
        raise RoutePlannerError("No route found.")

    route = routes[0]
    geometry = route.get("geometry")
    if not geometry:
        raise RoutePlannerError("Route geometry missing.")

    coordinates = decode_polyline6(geometry)
    distance_miles = route.get("distance", 0.0) / 1609.344
    duration_seconds = float(route.get("duration", 0.0))

    return RouteResult(
        distance_miles=distance_miles,
        duration_seconds=duration_seconds,
        geometry=geometry,
        geometry_format="polyline6",
        coordinates=coordinates,
    )


def decode_polyline6(polyline: str) -> List[Tuple[float, float]]:
    index = 0
    lat = 0
    lng = 0
    coordinates: List[Tuple[float, float]] = []
    while index < len(polyline):
        shift = 0
        result = 0
        while True:
            b = ord(polyline[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        delta_lat = ~(result >> 1) if (result & 1) else (result >> 1)
        lat += delta_lat

        shift = 0
        result = 0
        while True:
            b = ord(polyline[index]) - 63
            index += 1
            result |= (b & 0x1F) << shift
            shift += 5
            if b < 0x20:
                break
        delta_lng = ~(result >> 1) if (result & 1) else (result >> 1)
        lng += delta_lng

        coordinates.append((lat / 1e6, lng / 1e6))
    return coordinates


def haversine_miles(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    lat1, lon1 = a
    lat2, lon2 = b
    rad = math.radians
    dlat = rad(lat2 - lat1)
    dlon = rad(lon2 - lon1)
    lat1 = rad(lat1)
    lat2 = rad(lat2)
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * 3958.7613 * math.asin(math.sqrt(h))


def simplify_route_points(points: List[Tuple[float, float]], min_miles: float = 1.0) -> List[Tuple[float, float]]:
    if not points:
        return []
    simplified = [points[0]]
    last = points[0]
    for point in points[1:]:
        if haversine_miles(last, point) >= min_miles:
            simplified.append(point)
            last = point
    if simplified[-1] != points[-1]:
        simplified.append(points[-1])
    return simplified


def build_route_markers(points: List[Tuple[float, float]]) -> List[Tuple[float, float, float]]:
    markers = []
    total = 0.0
    prev = points[0]
    markers.append((prev[0], prev[1], total))
    for point in points[1:]:
        total += haversine_miles(prev, point)
        markers.append((point[0], point[1], total))
        prev = point
    return markers


def _bounding_box(points: List[Tuple[float, float]], buffer_miles: float) -> Tuple[float, float, float, float]:
    lats = [p[0] for p in points]
    lons = [p[1] for p in points]
    min_lat, max_lat = min(lats), max(lats)
    min_lon, max_lon = min(lons), max(lons)
    lat_buffer = buffer_miles / 69.0
    mid_lat = (min_lat + max_lat) / 2
    lon_buffer = buffer_miles / (69.0 * max(math.cos(math.radians(mid_lat)), 0.01))
    return (
        min_lat - lat_buffer,
        max_lat + lat_buffer,
        min_lon - lon_buffer,
        max_lon + lon_buffer,
    )


def get_cached_stations() -> List[Dict[str, Any]]:
    cache_key = "fuel_stations:all"
    cached = cache.get(cache_key)
    if cached:
        return cached

    stations = list(
        FuelStation.objects.exclude(latitude__isnull=True)
        .exclude(longitude__isnull=True)
        .values(
            "id",
            "opis_id",
            "truckstop_name",
            "address",
            "city",
            "state",
            "rack_id",
            "retail_price",
            "latitude",
            "longitude",
        )
    )

    for station in stations:
        station["retail_price"] = float(station["retail_price"])

    cache.set(cache_key, stations, timeout=60 * 60 * 24)
    return stations


def find_stations_on_route(
    route_points: List[Tuple[float, float]],
    max_distance_miles: float,
) -> List[StationOnRoute]:
    if not route_points:
        return []

    simplified = simplify_route_points(route_points)
    markers = build_route_markers(simplified)
    min_lat, max_lat, min_lon, max_lon = _bounding_box(simplified, max_distance_miles)

    stations = []
    for station in get_cached_stations():
        lat = station["latitude"]
        lon = station["longitude"]
        if lat < min_lat or lat > max_lat or lon < min_lon or lon > max_lon:
            continue

        min_distance = None
        mile_marker = 0.0
        for p_lat, p_lon, miles in markers:
            distance = haversine_miles((lat, lon), (p_lat, p_lon))
            if min_distance is None or distance < min_distance:
                min_distance = distance
                mile_marker = miles
        if min_distance is None or min_distance > max_distance_miles:
            continue

        stations.append(
            StationOnRoute(
                station_data=station,
                price=float(station["retail_price"]),
                mile_marker=mile_marker,
                distance_to_route=float(min_distance),
                latitude=lat,
                longitude=lon,
                virtual=False,
            )
        )
    return sorted(stations, key=lambda s: s.mile_marker)


def choose_start_price(
    stations: List[StationOnRoute],
    max_start_distance_miles: float,
) -> StationOnRoute:
    if not stations:
        raise RoutePlannerError("No fuel stations available on route.")

    start_candidates = [s for s in stations if s.mile_marker <= max_start_distance_miles]
    if not start_candidates:
        raise RoutePlannerError("No fuel stations found near the start location.")

    start_station = min(start_candidates, key=lambda s: (s.mile_marker, s.price))
    return StationOnRoute(
        station_data=start_station.station_data,
        price=start_station.price,
        mile_marker=0.0,
        distance_to_route=start_station.distance_to_route,
        latitude=start_station.latitude,
        longitude=start_station.longitude,
        virtual=True,
    )


def plan_fuel_stops(
    stations: List[StationOnRoute],
    total_miles: float,
    mpg: float,
    max_range_miles: float,
    start_price: StationOnRoute,
) -> Tuple[List[Dict[str, Any]], float, float]:
    capacity_gallons = max_range_miles / mpg
    stops = [start_price] + [s for s in stations if s.mile_marker > 0]
    destination = StationOnRoute(
        station_data=None,
        price=0.0,
        mile_marker=total_miles,
        distance_to_route=0.0,
        latitude=0.0,
        longitude=0.0,
        virtual=True,
    )
    stops.append(destination)

    fuel_gallons = 0.0
    total_cost = 0.0
    total_gallons = 0.0
    planned_stops: List[Dict[str, Any]] = []

    for index, stop in enumerate(stops[:-1]):
        max_reach = stop.mile_marker + max_range_miles
        next_cheaper = None
        for later in stops[index + 1 :]:
            if later.mile_marker > max_reach:
                break
            if later.price < stop.price:
                next_cheaper = later
                break
        if next_cheaper:
            target_miles = next_cheaper.mile_marker - stop.mile_marker
        else:
            target_miles = min(max_range_miles, total_miles - stop.mile_marker)

        required_gallons = target_miles / mpg
        if required_gallons > capacity_gallons + 1e-6:
            raise RoutePlannerError("Route segment exceeds vehicle range.")

        if fuel_gallons < required_gallons:
            purchase = required_gallons - fuel_gallons
            cost = purchase * stop.price
            fuel_gallons += purchase
            total_cost += cost
            total_gallons += purchase
            if not stop.virtual or stop.mile_marker == 0:
                station_payload = None
                if stop.station_data:
                    station_payload = {
                        "opis_id": stop.station_data.get("opis_id"),
                        "truckstop_name": stop.station_data.get("truckstop_name"),
                        "address": stop.station_data.get("address"),
                        "city": stop.station_data.get("city"),
                        "state": stop.station_data.get("state"),
                        "rack_id": stop.station_data.get("rack_id"),
                    }
                planned_stops.append(
                    {
                        "mile_marker": round(stop.mile_marker, 2),
                        "price_per_gallon": round(stop.price, 3),
                        "gallons": round(purchase, 3),
                        "cost": round(cost, 2),
                        "latitude": stop.latitude,
                        "longitude": stop.longitude,
                        "virtual": stop.virtual,
                        "station": station_payload,
                    }
                )

        next_stop = stops[index + 1]
        travel_miles = next_stop.mile_marker - stop.mile_marker
        fuel_gallons -= travel_miles / mpg
        if fuel_gallons < -1e-6:
            raise RoutePlannerError("Insufficient fuel to reach next stop.")

    return planned_stops, round(total_cost, 2), round(total_gallons, 3)


def route_plan_cache_key(payload: Dict[str, Any]) -> str:
    payload_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")
    return f"route_plan:{hashlib.sha256(payload_bytes).hexdigest()}"


def compute_route_plan(
    start_location: str,
    end_location: str,
    max_range_miles: int,
    mpg: float,
    max_station_distance_miles: float,
) -> Dict[str, Any]:
    cache_key = route_plan_cache_key(
        {
            "start": start_location,
            "end": end_location,
            "max_range_miles": max_range_miles,
            "mpg": mpg,
            "max_station_distance_miles": max_station_distance_miles,
        }
    )
    cached = cache.get(cache_key)
    if cached:
        return cached

    start_geo = geocode_location(start_location)
    end_geo = geocode_location(end_location)
    if not start_geo.is_us or not end_geo.is_us:
        raise RoutePlannerError("Start and end locations must be within the USA.")

    route = get_route((start_geo.latitude, start_geo.longitude), (end_geo.latitude, end_geo.longitude))
    stations_on_route = find_stations_on_route(route.coordinates, max_station_distance_miles)
    start_price = choose_start_price(stations_on_route, max_station_distance_miles)

    fuel_stops, total_cost, total_gallons = plan_fuel_stops(
        stations_on_route,
        route.distance_miles,
        mpg,
        max_range_miles,
        start_price,
    )

    response = {
        "start": {
            "query": start_location,
            "place_name": start_geo.place_name,
            "latitude": start_geo.latitude,
            "longitude": start_geo.longitude,
        },
        "end": {
            "query": end_location,
            "place_name": end_geo.place_name,
            "latitude": end_geo.latitude,
            "longitude": end_geo.longitude,
        },
        "route": {
            "distance_miles": round(route.distance_miles, 2),
            "duration_seconds": round(route.duration_seconds, 1),
            "geometry": route.geometry,
            "geometry_format": route.geometry_format,
        },
        "fueling": {
            "max_range_miles": max_range_miles,
            "mpg": mpg,
            "total_cost": total_cost,
            "total_gallons": total_gallons,
            "fuel_stops": fuel_stops,
        },
        "assumptions": [
            "Fuel price at the start uses the nearest station along the route.",
            "Fuel stops are optimized for cost under the configured range constraint.",
        ],
    }

    cache.set(cache_key, response, timeout=60 * 60)
    return response


def invalidate_station_cache() -> None:
    cache.delete("fuel_stations:all")
