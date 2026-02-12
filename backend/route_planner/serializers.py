from rest_framework import serializers


class RoutePlanRequestSerializer(serializers.Serializer):
    start_location = serializers.CharField()
    end_location = serializers.CharField()
    max_range_miles = serializers.IntegerField(min_value=1, default=500)
    mpg = serializers.FloatField(min_value=0.1, default=10.0)
    max_station_distance_miles = serializers.FloatField(min_value=0.1, default=10.0)
