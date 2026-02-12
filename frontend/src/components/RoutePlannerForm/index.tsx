import { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Card,
  CardContent,
  Chip,
  Stack,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import Grid from "@mui/material/Grid";
import {
  ExpandMore,
  LocalShipping,
  Place,
  Settings,
  Route as RouteIcon,
  Schedule,
} from "@mui/icons-material";
import { useRoutePlanner, RoutePlanRequest } from "@hooks";
import { FuelStopsList } from "../FuelStopsList";
import { RouteMap } from "../RouteMap";

export const RoutePlannerForm = () => {
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");
  const [maxRange, setMaxRange] = useState<string>("500");
  const [mpg, setMpg] = useState<string>("6.5");
  const [maxStationDistance, setMaxStationDistance] = useState<string>("5");

  const { mutate, data, isPending, isError, error, reset } = useRoutePlanner();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const request: RoutePlanRequest = {
      start_location: startLocation,
      end_location: endLocation,
    };

    // Add optional parameters if they have values
    if (maxRange) {
      request.max_range_miles = parseFloat(maxRange);
    }
    if (mpg) {
      request.mpg = parseFloat(mpg);
    }
    if (maxStationDistance) {
      request.max_station_distance_miles = parseFloat(maxStationDistance);
    }

    mutate(request);
  };

  const handleReset = () => {
    setStartLocation("");
    setEndLocation("");
    setMaxRange("500");
    setMpg("6.5");
    setMaxStationDistance("5");
    reset();
  };

  const isFormValid = startLocation.trim() !== "" && endLocation.trim() !== "";

  // When data exists, show split-screen layout; otherwise, full-width form
  const layoutSx: SxProps<Theme> = data
    ? {
        maxWidth: "100%",
        width: "100%",
        height: "100dvh",
        p: 2,
        boxSizing: "border-box",
        overflow: "hidden",
      }
    : { maxWidth: 1200, mx: "auto", p: 3 };

  const formPanel = (
    <Paper elevation={3} sx={{ p: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <LocalShipping sx={{ fontSize: 40, mr: 2, color: "primary.main" }} />
        <Typography variant="h4" component="h1">
          Route Planner
        </Typography>
      </Box>

      <form onSubmit={handleSubmit}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <TextField
            label="Start Location"
            value={startLocation}
            onChange={(e) => setStartLocation(e.target.value)}
            placeholder="e.g., New York, NY"
            required
            fullWidth
            InputProps={{
              startAdornment: <Place sx={{ mr: 1, color: "action.active" }} />,
            }}
          />

          <TextField
            label="End Location"
            value={endLocation}
            onChange={(e) => setEndLocation(e.target.value)}
            placeholder="e.g., Los Angeles, CA"
            required
            fullWidth
            InputProps={{
              startAdornment: <Place sx={{ mr: 1, color: "action.active" }} />,
            }}
          />

          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls="advanced-settings-content"
              id="advanced-settings-header"
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Settings sx={{ mr: 1 }} />
                <Typography>Advanced Settings</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  label="Max Range (miles)"
                  type="number"
                  value={maxRange}
                  onChange={(e) => setMaxRange(e.target.value)}
                  placeholder="500"
                  fullWidth
                  inputProps={{ step: "0.1", min: "0" }}
                  helperText="Maximum distance the vehicle can travel on a full tank"
                />

                <TextField
                  label="Miles Per Gallon (MPG)"
                  type="number"
                  value={mpg}
                  onChange={(e) => setMpg(e.target.value)}
                  placeholder="6.5"
                  fullWidth
                  inputProps={{ step: "0.1", min: "0" }}
                  helperText="Fuel efficiency of the vehicle"
                />

                <TextField
                  label="Max Station Distance (miles)"
                  type="number"
                  value={maxStationDistance}
                  onChange={(e) => setMaxStationDistance(e.target.value)}
                  placeholder="5"
                  fullWidth
                  inputProps={{ step: "0.1", min: "0" }}
                  helperText="Maximum distance from route to search for fuel stations"
                />
              </Box>
            </AccordionDetails>
          </Accordion>

          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={!isFormValid || isPending}
              startIcon={isPending ? <CircularProgress size={20} /> : <RouteIcon />}
              fullWidth
            >
              {isPending ? "Planning Route..." : "Plan Route"}
            </Button>

            {(data || isError) && (
              <Button
                variant="outlined"
                size="large"
                onClick={handleReset}
                sx={{ minWidth: 120 }}
              >
                Reset
              </Button>
            )}
          </Box>
        </Box>
      </form>

      {isError && error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          <Typography variant="body1" fontWeight="medium">
            Error:
          </Typography>
          <Typography variant="body2">
            {error.detail || "An error occurred while planning the route. Please try again."}
          </Typography>
        </Alert>
      )}
    </Paper>
  );

  return (
    <Box sx={layoutSx}>
      {data ? (
        <Grid container spacing={3} columns={12} sx={{ height: "100%", overflow: "hidden" }}>
          <Grid size={{ xs: 12, md: 4 }} sx={{ height: "100%", overflowY: "auto", pr: 1 }}>
            <Stack spacing={3}>
              {formPanel}
              <Paper elevation={3} sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                <RouteIcon sx={{ mr: 1 }} />
                Route Summary
              </Typography>

              <Box sx={{ mb: 4 }}>
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      From
                    </Typography>
                    <Typography variant="h6" gutterBottom>
                      {data.start.place_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {data.start.query}
                    </Typography>
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      To
                    </Typography>
                    <Typography variant="h6" gutterBottom>
                      {data.end.place_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {data.end.query}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>

              <Box sx={{ mb: 4, display: "flex", gap: 2, flexWrap: "wrap" }}>
                <Chip
                  icon={<RouteIcon />}
                  label={`Distance: ${data.route.distance_miles.toFixed(2)} miles`}
                  color="primary"
                  sx={{ fontSize: "1rem", py: 2.5 }}
                />
                <Chip
                  icon={<Schedule />}
                  label={`Duration: ${Math.floor(data.route.duration_seconds / 3600)}h ${Math.floor((data.route.duration_seconds % 3600) / 60)}m`}
                  color="secondary"
                  sx={{ fontSize: "1rem", py: 2.5 }}
                />
              </Box>

              {data.assumptions.length > 0 && (
                <Alert severity="info" sx={{ mb: 4 }}>
                  <Typography variant="body2" fontWeight="medium" gutterBottom>
                    Assumptions:
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {data.assumptions.map((assumption: string, index: number) => (
                      <li key={index}>
                        <Typography variant="body2">{assumption}</Typography>
                      </li>
                    ))}
                  </Box>
                </Alert>
              )}

              <Divider sx={{ my: 4 }} />
              <FuelStopsList
                fuelStops={data.fueling.fuel_stops}
                totalCost={data.fueling.total_cost}
                totalGallons={data.fueling.total_gallons}
              />
              </Paper>
            </Stack>
          </Grid>

          <Grid
            size={{ xs: 12, md: 8 }}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <RouteMap data={data} />
          </Grid>
        </Grid>
      ) : (
        formPanel
      )}
    </Box>
  );
};
