export interface RoutePlanRequest {
  start_location: string;
  end_location: string;
  max_range_miles?: number;
  mpg?: number;
  max_station_distance_miles?: number;
}

export interface LocationInfo {
  query: string;
  place_name: string;
  latitude: number;
  longitude: number;
}

export interface RouteInfo {
  distance_miles: number;
  duration_seconds: number;
  geometry: string;
  geometry_format: string;
}

export interface FuelStation {
  opis_id: number;
  truckstop_name: string;
  address: string;
  city: string;
  state: string;
  rack_id: number;
}

export interface FuelStop {
  mile_marker: number;
  price_per_gallon: number;
  gallons: number;
  cost: number;
  latitude: number;
  longitude: number;
  virtual: boolean;
  station: FuelStation | null;
}

export interface FuelingInfo {
  max_range_miles: number;
  mpg: number;
  total_cost: number;
  total_gallons: number;
  fuel_stops: FuelStop[];
}

export interface RoutePlanResponse {
  start: LocationInfo;
  end: LocationInfo;
  route: RouteInfo;
  fueling: FuelingInfo;
  assumptions: string[];
}

export interface ApiError {
  detail: string;
}
