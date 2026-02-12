from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RoutePlanRequestSerializer
from .services import RoutePlannerError, compute_route_plan


class RoutePlanView(APIView):
    authentication_classes: list = []
    permission_classes: list = []

    def post(self, request, *args, **kwargs):
        serializer = RoutePlanRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = compute_route_plan(**serializer.validated_data)
        except RoutePlannerError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(result, status=status.HTTP_200_OK)
