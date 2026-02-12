import { useMutation } from "@tanstack/react-query";
import { routePlannerService } from "./service";
import { RoutePlanRequest, RoutePlanResponse, ApiError } from "./types";

export const useRoutePlanner = () => {
  return useMutation<RoutePlanResponse, ApiError, RoutePlanRequest>({
    mutationFn: (data: RoutePlanRequest) => routePlannerService.planRoute(data),
  });
};
