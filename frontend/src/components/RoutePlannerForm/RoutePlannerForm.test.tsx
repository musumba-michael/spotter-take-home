import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RoutePlannerForm } from "./index";
import * as hooks from "@hooks";

// Mock the hooks
vi.mock("@hooks", async () => {
  const actual = await vi.importActual("@hooks");
  return {
    ...actual,
    useRoutePlanner: vi.fn(),
  };
});

// Mock child components
vi.mock("../FuelStopsList", () => ({
  FuelStopsList: () => <div data-testid="fuel-stops-list">Fuel Stops List</div>,
}));

vi.mock("../RouteMap", () => ({
  RouteMap: () => <div data-testid="route-map">Route Map</div>,
}));

describe("RoutePlannerForm", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Default mock implementation
    vi.mocked(hooks.useRoutePlanner).mockReturnValue({
      mutate: vi.fn(),
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    } as any);
  });

  const renderWithQuery = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
    );
  };

  it("should render form inputs", () => {
    renderWithQuery(<RoutePlannerForm />);

    expect(screen.getByRole("textbox", { name: /Start Location/i })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /End Location/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Plan Route/i })).toBeInTheDocument();
  });

  it("should disable submit button when form is invalid", () => {
    renderWithQuery(<RoutePlannerForm />);

    const submitButton = screen.getByRole("button", { name: /Plan Route/i });
    expect(submitButton).toBeDisabled();
  });

  it("should enable submit button when both locations are filled", () => {
    renderWithQuery(<RoutePlannerForm />);

    const startInput = screen.getByRole("textbox", { name: /Start Location/i });
    const endInput = screen.getByRole("textbox", { name: /End Location/i });

    fireEvent.change(startInput, { target: { value: "New York, NY" } });
    fireEvent.change(endInput, { target: { value: "Los Angeles, CA" } });

    const submitButton = screen.getByRole("button", { name: /Plan Route/i });
    expect(submitButton).not.toBeDisabled();
  });

  it("should call mutate with form values on submit", () => {
    const mutateMock = vi.fn();
    vi.mocked(hooks.useRoutePlanner).mockReturnValue({
      mutate: mutateMock,
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    } as any);

    renderWithQuery(<RoutePlannerForm />);

    const startInput = screen.getByRole("textbox", { name: /Start Location/i });
    const endInput = screen.getByRole("textbox", { name: /End Location/i });
    const submitButton = screen.getByRole("button", { name: /Plan Route/i });

    fireEvent.change(startInput, { target: { value: "New York, NY" } });
    fireEvent.change(endInput, { target: { value: "Los Angeles, CA" } });
    fireEvent.click(submitButton);

    expect(mutateMock).toHaveBeenCalledWith({
      start_location: "New York, NY",
      end_location: "Los Angeles, CA",
      max_range_miles: 500,
      mpg: 6.5,
      max_station_distance_miles: 5,
    });
  });

  it("should show loading state when request is pending", () => {
    vi.mocked(hooks.useRoutePlanner).mockReturnValue({
      mutate: vi.fn(),
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      reset: vi.fn(),
    } as any);

    renderWithQuery(<RoutePlannerForm />);

    expect(screen.getByText(/Planning Route.../i)).toBeInTheDocument();
  });

  it("should display error message when request fails", () => {
    const errorDetail = "Unable to geocode start location";
    vi.mocked(hooks.useRoutePlanner).mockReturnValue({
      mutate: vi.fn(),
      data: undefined,
      isPending: false,
      isError: true,
      error: { detail: errorDetail },
      reset: vi.fn(),
    } as any);

    renderWithQuery(<RoutePlannerForm />);

    expect(screen.getByText(errorDetail)).toBeInTheDocument();
  });

  it("should show reset button when data is available", () => {
    const mockData = {
      start: {
        place_name: "New York, NY",
        query: "New York",
        latitude: 40.7128,
        longitude: -74.006,
      },
      end: {
        place_name: "Los Angeles, CA",
        query: "Los Angeles",
        latitude: 34.0522,
        longitude: -118.2437,
      },
      route: {
        geometry: "encoded_polyline",
        distance: 2789.6,
        distance_miles: 2789.6,
        duration: 144000,
        duration_seconds: 144000,
      },
      fueling: {
        fuel_stops: [],
        total_cost: 0,
        total_gallons: 0,
      },
      assumptions: [],
    };

    vi.mocked(hooks.useRoutePlanner).mockReturnValue({
      mutate: vi.fn(),
      data: mockData,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    } as any);

    renderWithQuery(<RoutePlannerForm />);

    expect(screen.getByRole("button", { name: /Reset/i })).toBeInTheDocument();
  });

  it("should render split-screen layout when data is available", () => {
    const mockData = {
      start: {
        place_name: "New York, NY",
        query: "New York",
        latitude: 40.7128,
        longitude: -74.006,
      },
      end: {
        place_name: "Los Angeles, CA",
        query: "Los Angeles",
        latitude: 34.0522,
        longitude: -118.2437,
      },
      route: {
        geometry: "encoded_polyline",
        distance: 2789.6,
        distance_miles: 2789.6,
        duration: 144000,
        duration_seconds: 144000,
      },
      fueling: {
        fuel_stops: [],
        total_cost: 0,
        total_gallons: 0,
      },
      assumptions: [],
    };

    vi.mocked(hooks.useRoutePlanner).mockReturnValue({
      mutate: vi.fn(),
      data: mockData,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    } as any);

    renderWithQuery(<RoutePlannerForm />);

    expect(screen.getByTestId("fuel-stops-list")).toBeInTheDocument();
    expect(screen.getByTestId("route-map")).toBeInTheDocument();
    expect(screen.getByText(/Route Summary/i)).toBeInTheDocument();
  });

  it("should display route distance and duration", async () => {
    const mockData = {
      start: {
        place_name: "New York, NY",
        query: "New York",
        latitude: 40.7128,
        longitude: -74.006,
      },
      end: {
        place_name: "Los Angeles, CA",
        query: "Los Angeles",
        latitude: 34.0522,
        longitude: -118.2437,
      },
      route: {
        geometry: "encoded_polyline",
        distance: 2789.6,
        distance_miles: 2789.6,
        duration: 144000,
        duration_seconds: 144000,
      },
      fueling: {
        fuel_stops: [],
        total_cost: 0,
        total_gallons: 0,
      },
      assumptions: [],
    };

    vi.mocked(hooks.useRoutePlanner).mockReturnValue({
      mutate: vi.fn(),
      data: mockData,
      isPending: false,
      isError: false,
      error: null,
      reset: vi.fn(),
    } as any);

    renderWithQuery(<RoutePlannerForm />);

    await waitFor(() => {
      expect(screen.getByText(/Distance: 2789\.60 miles/i)).toBeInTheDocument();
      expect(screen.getByText(/Duration: 40h 0m/i)).toBeInTheDocument();
    });
  });

  it("should call reset function when reset button is clicked", () => {
    const resetMock = vi.fn();
    const mockData = {
      start: {
        place_name: "New York, NY",
        query: "New York",
        latitude: 40.7128,
        longitude: -74.006,
      },
      end: {
        place_name: "Los Angeles, CA",
        query: "Los Angeles",
        latitude: 34.0522,
        longitude: -118.2437,
      },
      route: {
        geometry: "encoded_polyline",
        distance: 2789.6,
        distance_miles: 2789.6,
        duration: 144000,
        duration_seconds: 144000,
      },
      fueling: {
        fuel_stops: [],
        total_cost: 0,
        total_gallons: 0,
      },
      assumptions: [],
    };

    vi.mocked(hooks.useRoutePlanner).mockReturnValue({
      mutate: vi.fn(),
      data: mockData,
      isPending: false,
      isError: false,
      error: null,
      reset: resetMock,
    } as any);

    renderWithQuery(<RoutePlannerForm />);

    const resetButton = screen.getByRole("button", { name: /Reset/i });
    fireEvent.click(resetButton);

    expect(resetMock).toHaveBeenCalled();
  });

  it("should expand and show advanced settings", () => {
    renderWithQuery(<RoutePlannerForm />);

    const advancedSettingsButton = screen.getByText(/Advanced Settings/i);
    fireEvent.click(advancedSettingsButton);

    expect(screen.getByRole("spinbutton", { name: /Max Range/i })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: /Miles Per Gallon/i })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: /Max Station Distance/i })).toBeInTheDocument();
  });
});
