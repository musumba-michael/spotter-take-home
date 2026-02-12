import { Box, Card, CardContent, Typography, Chip } from "@mui/material";
import { LocalGasStation, AttachMoney, Route as RouteIcon } from "@mui/icons-material";
import { FuelStop } from "@hooks";

interface FuelStopsListProps {
  fuelStops: FuelStop[];
  totalCost: number;
  totalGallons: number;
}

export const FuelStopsList = ({ fuelStops, totalCost, totalGallons }: FuelStopsListProps) => {
  return (
    <Box>
      <Box sx={{ mb: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Chip
          icon={<AttachMoney />}
          label={`Total Cost: $${totalCost.toFixed(2)}`}
          color="primary"
          sx={{ fontSize: "1rem", py: 2.5 }}
        />
        <Chip
          icon={<LocalGasStation />}
          label={`Total Fuel: ${totalGallons.toFixed(2)} gal`}
          color="secondary"
          sx={{ fontSize: "1rem", py: 2.5 }}
        />
        <Chip
          icon={<RouteIcon />}
          label={`${fuelStops.length} Stop${fuelStops.length !== 1 ? "s" : ""}`}
          sx={{ fontSize: "1rem", py: 2.5 }}
        />
      </Box>

      <Typography variant="h6" gutterBottom>
        Fuel Stops Along Route
      </Typography>

      {fuelStops.map((stop, index) => (
        <Card key={index} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
              <Box>
                <Typography variant="h6" component="div">
                  Stop {index + 1} {stop.virtual && <Chip label="Start" size="small" color="info" sx={{ ml: 1 }} />}
                </Typography>
                {stop.station && (
                  <>
                    <Typography variant="body1" color="text.primary" fontWeight="medium">
                      {stop.station.truckstop_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stop.station.address}, {stop.station.city}, {stop.station.state}
                    </Typography>
                  </>
                )}
              </Box>
              <Chip label={`Mile ${stop.mile_marker.toFixed(1)}`} variant="outlined" />
            </Box>

            <Box sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}>
              <Chip icon={<AttachMoney />} label={`$${stop.price_per_gallon.toFixed(3)}/gal`} size="small" />
              <Chip icon={<LocalGasStation />} label={`${stop.gallons.toFixed(2)} gal`} size="small" color="primary" />
              <Chip label={`Cost: $${stop.cost.toFixed(2)}`} size="small" color="secondary" />
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};
