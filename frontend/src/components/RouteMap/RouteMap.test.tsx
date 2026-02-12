import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { RouteMap } from "./index";
import type { RoutePlanResponse } from "@hooks/route_planner/types";

// Mock mapbox-gl
vi.mock("mapbox-gl", () => ({
  default: {
    accessToken: "",
    Map: vi.fn(function() {
      const callbacks: Record<string, Function> = {};
      return {
        on: vi.fn((event: string, callback: Function) => {
          callbacks[event] = callback;
          if (event === "load") {
            callback();
          }
        }),
        addSource: vi.fn(),
        addLayer: vi.fn(),
        fitBounds: vi.fn(),
        remove: vi.fn(),
      };
    }),
    Marker: vi.fn(function(this: any) {
      return {
        setLngLat: vi.fn(function(this: any) { return this; }),
        setPopup: vi.fn(function(this: any) { return this; }),
        addTo: vi.fn(function(this: any) { return this; }),
      };
    }),
    Popup: vi.fn(function(this: any) {
      return {
        setHTML: vi.fn(function(this: any) { return this; }),
      };
    }),
    LngLatBounds: vi.fn(function(this: any) {
      return {
        extend: vi.fn(function(this: any) { return this; }),
      };
    }),
  },
}));

vi.mock("@utils/mapUtils", () => ({
  decodePolyline6: vi.fn(() => [
    [-89.6501, 39.7817],
    [-88.5678, 40.1234],
  ]),
  nearestPointOnLine: vi.fn((_point, line) => line[0]),
}));

describe("RouteMap", () => {
  const mockData: RoutePlanResponse = {
    start: {
      query: "Start City",
      place_name: "Start City, State",
      latitude: 39.7817,
      longitude: -89.6501,
    },
    end: {
      query: "End City",
      place_name: "End City, State",
      latitude: 40.1234,
      longitude: -88.5678,
    },
    route: {
      geometry: "mockEncodedPolyline",
      geometry_format: "polyline6",
      distance_miles: 150.5,
      duration_seconds: 8100,
    },
    fueling: {
      fuel_stops: [
        {
          mile_marker: 0,
          gallons: 50,
          price_per_gallon: 3.5,
          cost: 175,
          latitude: 39.7817,
          longitude: -89.6501,
          virtual: true,
          station: {
            opis_id: 1,
            truckstop_name: "Start Station",
            address: "123 Main St",
            city: "Springfield",
            state: "IL",
            rack_id: 101,
          },
        },
        {
          mile_marker: 75.3,
          gallons: 60,
          price_per_gallon: 3.55,
          cost: 213,
          latitude: 39.9,
          longitude: -89.1,
          virtual: false,
          station: {
            opis_id: 2,
            truckstop_name: "Mid Station",
            address: "456 Highway Rd",
            city: "Midtown",
            state: "IL",
            rack_id: 102,
          },
        },
      ],
      max_range_miles: 500,
      mpg: 6.5,
      total_cost: 388,
      total_gallons: 110,
    },
    assumptions: [],
  };

  beforeEach(() => {
    // Mock environment variable
    vi.stubEnv("VITE_MAPBOX_ACCESS_TOKEN", "test_token");
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should render map container", () => {
    const { container } = render(<RouteMap data={mockData} />);
    // Verify the component rendered
    expect(container.firstChild).toBeTruthy();
    expect(container.querySelector('.MuiPaper-root')).toBeInTheDocument();
  });

  it("should initialize Mapbox map with correct center", async () => {
    const mapboxgl = await import("mapbox-gl");
    render(<RouteMap data={mockData} />);

    await waitFor(() => {
      expect(mapboxgl.default.Map).toHaveBeenCalled();
    });

    const mapCall = (mapboxgl.default.Map as any).mock.calls[0][0];
    expect(mapCall.center).toEqual([
      (mockData.start.longitude + mockData.end.longitude) / 2,
      (mockData.start.latitude + mockData.end.latitude) / 2,
    ]);
  });

  it("should add route source and layer", async () => {
    const mapboxgl = await import("mapbox-gl");
    render(<RouteMap data={mockData} />);

    await waitFor(() => {
      const mapInstance = (mapboxgl.default.Map as any).mock.results[0].value;
      expect(mapInstance.addSource).toHaveBeenCalledWith("route", expect.any(Object));
      expect(mapInstance.addLayer).toHaveBeenCalledWith(
        expect.objectContaining({ id: "route" })
      );
    });
  });

  it("should add connector lines for fuel stops", async () => {
    const mapboxgl = await import("mapbox-gl");
    render(<RouteMap data={mockData} />);

    await waitFor(() => {
      const mapInstance = (mapboxgl.default.Map as any).mock.results[0].value;
      expect(mapInstance.addSource).toHaveBeenCalledWith("connectors", expect.any(Object));
      expect(mapInstance.addLayer).toHaveBeenCalledWith(
        expect.objectContaining({ id: "connectors" })
      );
    });
  });

  it("should create markers for start, end, and fuel stops", async () => {
    const mapboxgl = await import("mapbox-gl");
    render(<RouteMap data={mockData} />);

    await waitFor(() => {
      // 2 fuel stops + start + end = 4 markers
      expect(mapboxgl.default.Marker).toHaveBeenCalledTimes(4);
    });
  });

  it("should fit bounds to show entire route", async () => {
    const mapboxgl = await import("mapbox-gl");
    render(<RouteMap data={mockData} />);

    await waitFor(() => {
      const mapInstance = (mapboxgl.default.Map as any).mock.results[0].value;
      expect(mapInstance.fitBounds).toHaveBeenCalled();
    });
  });

  it("should cleanup map on unmount", async () => {
    const mapboxgl = await import("mapbox-gl");
    const { unmount } = render(<RouteMap data={mockData} />);

    unmount();

    await waitFor(() => {
      const mapInstance = (mapboxgl.default.Map as any).mock.results[0].value;
      expect(mapInstance.remove).toHaveBeenCalled();
    });
  });

  it("should log error if Mapbox token is missing", () => {
    vi.unstubAllEnvs();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<RouteMap data={mockData} />);

    expect(consoleErrorSpy).toHaveBeenCalledWith("Mapbox token not configured");
    consoleErrorSpy.mockRestore();
  });
});
