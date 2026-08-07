// DTOs/EstimateDtos.cs
using TruckMe.Domain.Enums;

namespace TruckMe.Application.DTOs;

public record EstimateRequest(
    double PickupLatitude,
    double PickupLongitude,
    string PickupAddress,
    List<DeliveryStopDto> Stops,
    CargoType CargoType,
    VehicleSize RequiredVehicleSize,
    bool NeedsHelpers = false,
    int HelperCount = 0,
    bool NeedsLoading = false,
    bool NeedsUnloading = false,
    bool IsExpress = false,
    bool IsFullDay = false
);

public record EstimateResponse(
    decimal BaseFare,
    decimal DistanceFare,
    decimal StopFare,
    decimal AddOnFare,
    decimal SurgeMultiplier,
    decimal TotalFare,
    decimal TotalDistanceKm,
    int EstimatedDurationMinutes,
    int StopCount
);
