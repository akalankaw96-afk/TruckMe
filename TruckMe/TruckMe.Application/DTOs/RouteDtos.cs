namespace TruckMe.Application.DTOs;

public record RouteOptimizationRequest(
    decimal OriginLatitude,
    decimal OriginLongitude,
    string OriginAddress,
    List<DeliveryStopPointDto> Stops
);

public record DeliveryStopPointDto(
    int Id,
    string Address,
    decimal Latitude,
    decimal Longitude,
    string RecipientName,
    string RecipientPhone
);

public record RouteOptimizationResponse(
    List<DeliveryStopPointDto> OptimizedStops,
    decimal TotalDistanceKm,
    int EstimatedDurationMinutes,
    decimal FuelSavingsEstimateLkr
);
