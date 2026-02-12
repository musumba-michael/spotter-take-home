import { useEffect, useRef } from "react";
import { Box, Paper } from "@mui/material";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Feature, FeatureCollection, LineString } from "geojson";
import { RoutePlanResponse } from "@hooks/route_planner/types";
import { decodePolyline6, nearestPointOnLine } from "@utils/mapUtils";

interface RouteMapProps {
  data: RoutePlanResponse;
}

export const RouteMap = ({ data }: RouteMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    if (!mapboxToken) {
      console.error("Mapbox token not configured");
      return;
    }

    if (!mapContainer.current) return;

    mapboxgl.accessToken = mapboxToken;

    const center: [number, number] = [
      (data.start.longitude + data.end.longitude) / 2,
      (data.start.latitude + data.end.latitude) / 2,
    ];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom: 6,
    });

    map.current.on("load", () => {
      const coordinates = decodePolyline6(data.route.geometry);

      // Add route source and layer
      map.current!.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates,
          },
          properties: {},
        },
      });

      map.current!.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#1976d2",
          "line-width": 4,
        },
      });

      const connectorFeatures: Feature<LineString>[] = data.fueling.fuel_stops
        .filter((stop) => stop.station)
        .map((stop) => {
          const stopPoint: [number, number] = [stop.longitude, stop.latitude];
          const nearest = nearestPointOnLine(stopPoint, coordinates);
          return {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [stopPoint, nearest],
            },
            properties: {},
          };
        });

      const connectorCollection: FeatureCollection<LineString> = {
        type: "FeatureCollection",
        features: connectorFeatures,
      };

      map.current!.addSource("connectors", {
        type: "geojson",
        data: connectorCollection,
      });

      map.current!.addLayer({
        id: "connectors",
        type: "line",
        source: "connectors",
        paint: {
          "line-color": "#ff9800",
          "line-width": 2,
          "line-dasharray": [2, 2],
        },
      });

      // Add markers for start, end, and fuel stops
      // Start marker (green)
      const startMarker = document.createElement("div");
      startMarker.style.width = "30px";
      startMarker.style.height = "30px";
      startMarker.style.background = "#4caf50";
      startMarker.style.borderRadius = "50%";
      startMarker.style.border = "3px solid white";
      startMarker.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";

      new mapboxgl.Marker(startMarker)
        .setLngLat([data.start.longitude, data.start.latitude])
        .setPopup(
          new mapboxgl.Popup().setHTML(
            `<strong>Start</strong><br>${data.start.place_name}`
          )
        )
        .addTo(map.current!);

      // End marker (red)
      const endMarker = document.createElement("div");
      endMarker.style.width = "30px";
      endMarker.style.height = "30px";
      endMarker.style.background = "#f44336";
      endMarker.style.borderRadius = "50%";
      endMarker.style.border = "3px solid white";
      endMarker.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";

      new mapboxgl.Marker(endMarker)
        .setLngLat([data.end.longitude, data.end.latitude])
        .setPopup(
          new mapboxgl.Popup().setHTML(
            `<strong>End</strong><br>${data.end.place_name}`
          )
        )
        .addTo(map.current!);

      // Fuel stop markers (orange)
      data.fueling.fuel_stops.forEach((stop, index) => {
        if (stop.station) {
          const fuelMarker = document.createElement("div");
          fuelMarker.style.width = "28px";
          fuelMarker.style.height = "28px";
          fuelMarker.style.background = "#ff9800";
          fuelMarker.style.borderRadius = "50%";
          fuelMarker.style.border = "2px solid white";
          fuelMarker.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
          fuelMarker.style.display = "flex";
          fuelMarker.style.alignItems = "center";
          fuelMarker.style.justifyContent = "center";
          fuelMarker.style.fontSize = "12px";
          fuelMarker.style.fontWeight = "bold";
          fuelMarker.style.color = "white";
          fuelMarker.textContent = String(index + 1);

          const popupHTML = `
            <strong>${stop.station.truckstop_name}</strong><br>
            ${stop.station.address}<br>
            ${stop.station.city}, ${stop.station.state}<br>
            <br>
            <strong>Fuel Details:</strong><br>
            Gallons: ${stop.gallons}<br>
            Price/gal: $${stop.price_per_gallon}<br>
            Total Cost: $${stop.cost}
          `;

          new mapboxgl.Marker(fuelMarker)
            .setLngLat([stop.longitude, stop.latitude])
            .setPopup(new mapboxgl.Popup().setHTML(popupHTML))
            .addTo(map.current!);
        }
      });

      // Fit bounds to show entire route
      const allCoordinates = [
        [data.start.longitude, data.start.latitude],
        [data.end.longitude, data.end.latitude],
        ...data.fueling.fuel_stops.map((stop) => [stop.longitude, stop.latitude]),
      ];

      const bounds = allCoordinates.reduce(
        (bounds, coord) => {
          return bounds.extend(coord as [number, number]);
        },
        new mapboxgl.LngLatBounds(
          [data.start.longitude, data.start.latitude],
          [data.start.longitude, data.start.latitude]
        )
      );

      map.current!.fitBounds(bounds, { padding: 50 });
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [data, mapboxToken]);

  return (
    <Paper elevation={2} sx={{ width: "100%", height: "100%" }}>
      <Box
        ref={mapContainer}
        sx={{
          width: "100%",
          height: "100%",
          borderRadius: 1,
          overflow: "hidden",
        }}
      />
    </Paper>
  );
};
