import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FuelStopsList } from "./index";
import type { FuelStop } from "@hooks";

describe("FuelStopsList", () => {
  const mockStation = {
    opis_id: 1,
    truckstop_name: "Test Truck Stop",
    address: "123 Main St",
    city: "Springfield",
    state: "IL",
    rack_id: 101,
  };

  const mockFuelStops: FuelStop[] = [
    {
      mile_marker: 0,
      gallons: 50,
      price_per_gallon: 3.5,
      cost: 175,
      latitude: 39.7817,
      longitude: -89.6501,
      virtual: true,
      station: mockStation,
    },
    {
      mile_marker: 150.5,
      gallons: 75,
      price_per_gallon: 3.55,
      cost: 266.25,
      latitude: 40.1234,
      longitude: -88.5678,
      virtual: false,
      station: {
        opis_id: 2,
        truckstop_name: "Second Stop",
        address: "456 Highway Rd",
        city: "Midtown",
        state: "IL",
        rack_id: 102,
      },
    },
  ];

  it("should render summary chips with correct totals", () => {
    render(
      <FuelStopsList
        fuelStops={mockFuelStops}
        totalCost={441.25}
        totalGallons={125}
      />
    );

    expect(screen.getByText(/Total Cost: \$441\.25/)).toBeInTheDocument();
    expect(screen.getByText(/Total Fuel: 125\.00 gal/)).toBeInTheDocument();
    expect(screen.getByText(/2 Stops/)).toBeInTheDocument();
  });

  it("should show singular 'Stop' when only one stop", () => {
    render(
      <FuelStopsList
        fuelStops={[mockFuelStops[0]]}
        totalCost={175}
        totalGallons={50}
      />
    );

    expect(screen.getByText(/1 Stop$/)).toBeInTheDocument();
  });

  it("should render each fuel stop with station details", () => {
    render(
      <FuelStopsList
        fuelStops={mockFuelStops}
        totalCost={441.25}
        totalGallons={125}
      />
    );

    expect(screen.getByText("Test Truck Stop")).toBeInTheDocument();
    expect(screen.getByText("Second Stop")).toBeInTheDocument();
    expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
    expect(screen.getByText(/456 Highway Rd/)).toBeInTheDocument();
  });

  it("should display 'Start' chip for virtual stops", () => {
    render(
      <FuelStopsList
        fuelStops={mockFuelStops}
        totalCost={441.25}
        totalGallons={125}
      />
    );

    const startChips = screen.getAllByText("Start");
    expect(startChips).toHaveLength(1);
  });

  it("should show mile marker for each stop", () => {
    render(
      <FuelStopsList
        fuelStops={mockFuelStops}
        totalCost={441.25}
        totalGallons={125}
      />
    );

    expect(screen.getByText(/Mile 0\.0/)).toBeInTheDocument();
    expect(screen.getByText(/Mile 150\.5/)).toBeInTheDocument();
  });

  it("should display fuel details for each stop", () => {
    render(
      <FuelStopsList
        fuelStops={mockFuelStops}
        totalCost={441.25}
        totalGallons={125}
      />
    );

    expect(screen.getByText(/\$3\.500\/gal/)).toBeInTheDocument();
    expect(screen.getByText(/50\.00 gal/)).toBeInTheDocument();
    expect(screen.getByText(/Cost: \$175\.00/)).toBeInTheDocument();
    
    expect(screen.getByText(/\$3\.550\/gal/)).toBeInTheDocument();
    expect(screen.getByText(/75\.00 gal/)).toBeInTheDocument();
    expect(screen.getByText(/Cost: \$266\.25/)).toBeInTheDocument();
  });

  it("should handle empty fuel stops array", () => {
    render(
      <FuelStopsList
        fuelStops={[]}
        totalCost={0}
        totalGallons={0}
      />
    );

    expect(screen.getByText(/Total Cost: \$0\.00/)).toBeInTheDocument();
    expect(screen.getByText(/0 Stops/)).toBeInTheDocument();
    expect(screen.getByText("Fuel Stops Along Route")).toBeInTheDocument();
  });
});
