using TruckMe.Domain.Enums;

namespace TruckMe.Application.DTOs;

public record AiVehicleRecommendationRequest(
    double WeightKg,
    double VolumeCbm,
    double LengthMeters,
    double WidthMeters,
    double HeightMeters,
    CargoType CargoType,
    int RequiredHelpers = 0
);

public record AiVehicleRecommendationResponse(
    VehicleSize RecommendedVehicleSize,
    string RecommendedVehicleName,
    int SuggestedTruckCount,
    string CapacityDescription,
    string CargoHandlingAdvice,
    decimal EstimatedBasePriceLkr
);
