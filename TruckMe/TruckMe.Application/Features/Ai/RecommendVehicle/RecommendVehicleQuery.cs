using MediatR;
using TruckMe.Application.DTOs;
using TruckMe.Domain.Enums;

namespace TruckMe.Application.Features.Ai.RecommendVehicle;

public class RecommendVehicleQuery : IRequest<AiVehicleRecommendationResponse>
{
    public double WeightKg { get; set; }
    public double VolumeCbm { get; set; }
    public double LengthMeters { get; set; }
    public double WidthMeters { get; set; }
    public double HeightMeters { get; set; }
    public CargoType CargoType { get; set; }
    public int RequiredHelpers { get; set; }
}

public class RecommendVehicleQueryHandler : IRequestHandler<RecommendVehicleQuery, AiVehicleRecommendationResponse>
{
    public Task<AiVehicleRecommendationResponse> Handle(RecommendVehicleQuery request, CancellationToken cancellationToken)
    {
        VehicleSize size;
        string name;
        int truckCount = 1;
        decimal basePrice;

        // Temperature controlled logic
        if (request.CargoType == CargoType.Frozen)
        {
            size = VehicleSize.FreezerTruck;
            name = "Freezer Truck (-18°C)";
            basePrice = 15000m;
        }
        else if (request.CargoType == CargoType.Chilled)
        {
            size = (request.WeightKg <= 1000) ? VehicleSize.RefrigeratedVan : VehicleSize.ChillerTruck;
            name = (request.WeightKg <= 1000) ? "Refrigerated Van (2°C to 8°C)" : "Chiller Truck (0°C to 4°C)";
            basePrice = (request.WeightKg <= 1000) ? 8000m : 12000m;
        }
        else
        {
            // Weight & Volume threshold evaluation
            if (request.WeightKg <= 500 && request.VolumeCbm <= 3)
            {
                size = VehicleSize.MiniTruck;
                name = "Mini Truck (500 kg max)";
                basePrice = 2500m;
            }
            else if (request.WeightKg <= 1000 && request.VolumeCbm <= 6)
            {
                size = VehicleSize.OneTon;
                name = "1 Ton Truck";
                basePrice = 4000m;
            }
            else if (request.WeightKg <= 2000 && request.VolumeCbm <= 12)
            {
                size = VehicleSize.TwoTon;
                name = "2 Ton Truck";
                basePrice = 6500m;
            }
            else if (request.WeightKg <= 3000 && request.VolumeCbm <= 18)
            {
                size = VehicleSize.ThreeTon;
                name = "3 Ton Truck";
                basePrice = 9000m;
            }
            else if (request.WeightKg <= 5000 && request.VolumeCbm <= 30)
            {
                size = VehicleSize.FiveTon;
                name = "5 Ton Truck";
                basePrice = 14000m;
            }
            else if (request.WeightKg <= 10000 && request.VolumeCbm <= 55)
            {
                size = VehicleSize.TenTon;
                name = "10 Ton Heavy Truck";
                basePrice = 22000m;
            }
            else
            {
                size = VehicleSize.Container;
                name = "40ft Container Truck / Multi-Fleet";
                truckCount = (int)Math.Ceiling(request.WeightKg / 10000.0);
                basePrice = 35000m * truckCount;
            }
        }

        string advice = request.CargoType switch
        {
            CargoType.Chilled => "Requires thermal insulation monitoring. Chilled air locks enabled.",
            CargoType.Frozen => "Requires active freezing unit pre-cool to -18°C prior to loading.",
            CargoType.Fragile => "Requires bubble padding, tie-down straps, and cautious driving speed limits.",
            CargoType.Hazardous => "Requires hazmat containment safety sheet and licensed driver certification.",
            _ => "Standard dry cargo loading procedure. Ensure weight distribution across axle points."
        };

        var response = new AiVehicleRecommendationResponse(
            size,
            name,
            truckCount,
            $"Rated capacity: up to {request.WeightKg:N0} kg weight & {request.VolumeCbm:N1} m³ volume",
            advice,
            basePrice
        );

        return Task.FromResult(response);
    }
}
