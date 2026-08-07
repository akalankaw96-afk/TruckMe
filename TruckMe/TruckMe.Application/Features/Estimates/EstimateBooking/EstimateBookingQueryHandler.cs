// Features/Estimates/EstimateBooking/EstimateBookingQueryHandler.cs
using MediatR;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.DTOs;
using TruckMe.Domain.Enums;

namespace TruckMe.Application.Features.Estimates.EstimateBooking;

public sealed class EstimateBookingQueryHandler : IRequestHandler<EstimateBookingQuery, EstimateResponse>
{
    private readonly IGeoService _geoService;

    public EstimateBookingQueryHandler(IGeoService geoService)
    {
        _geoService = geoService;
    }

    public async Task<EstimateResponse> Handle(
        EstimateBookingQuery request,
        CancellationToken cancellationToken)
    {
        // 1. Build the list of all coordinate points: pickup + all delivery stops
        var points = new List<(decimal lat, decimal lon)>
        {
            (request.PickupLatitude, request.PickupLongitude)
        };

        points.AddRange(request.Stops.Select(s => (s.Latitude, s.Longitude)));

        // 2. Get total route distance and estimated duration
        var totalDistanceKm = await _geoService.GetTotalDistanceKmAsync(points);
        var estimatedMinutes = await _geoService.GetEstimatedMinutesAsync(totalDistanceKm);

        // 3. Base fare by vehicle size (LKR)
        var baseFare = GetBaseFare(request.RequiredVehicleSize);

        // 4. Distance fare by vehicle size per km (LKR/km)
        var perKmRate = GetPerKmRate(request.RequiredVehicleSize);
        var distanceFare = Math.Round((decimal)totalDistanceKm * perKmRate, 2);

        // 5. Stop fare: each additional stop after the first costs LKR 200
        //    With 1 stop → no extra charge; with 2 stops → 200; etc.
        var stopFare = Math.Max(0, request.Stops.Count - 1) * 200m;

        // 6. Add-on fares
        var helperFare = request.NeedsHelpers ? request.HelperCount * 500m : 0m;
        var loadingFare = request.NeedsLoading ? 300m : 0m;
        var unloadingFare = request.NeedsUnloading ? 300m : 0m;
        var expressFare = request.IsExpress ? Math.Round(baseFare * 0.30m, 2) : 0m;
        var fullDayFare = request.IsFullDay ? 5000m : 0m;
        var cargoSurcharge = GetCargoSurcharge(request.CargoType);

        var addOnFare = Math.Round(
            helperFare + loadingFare + unloadingFare + expressFare + fullDayFare + cargoSurcharge,
            2);

        // 7. Dynamic Surge multiplier
        var currentHour = DateTime.UtcNow.AddHours(5.5).Hour; // Sri Lanka IST (UTC+5:30)
        bool isPeakHour = (currentHour >= 8 && currentHour <= 10) || (currentHour >= 17 && currentHour <= 19);
        
        var surgeMultiplier = 1.0m;
        if (isPeakHour) surgeMultiplier += 0.15m;
        if (request.IsExpress) surgeMultiplier += 0.10m;

        // 8. Total fare
        var totalFare = Math.Round(
            (baseFare + distanceFare + stopFare + addOnFare) * surgeMultiplier,
            2);

        return new EstimateResponse(
            BaseFare: baseFare,
            DistanceFare: distanceFare,
            StopFare: stopFare,
            AddOnFare: addOnFare,
            SurgeMultiplier: surgeMultiplier,
            TotalFare: totalFare,
            TotalDistanceKm: Math.Round(totalDistanceKm, 2),
            EstimatedDurationMinutes: estimatedMinutes,
            StopCount: request.Stops.Count
        );
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private static decimal GetBaseFare(VehicleSize size) => size switch
    {
        VehicleSize.MiniTruck => 500m,
        VehicleSize.OneTon => 800m,
        VehicleSize.TwoTon => 1200m,
        VehicleSize.ThreeTon => 1500m,
        VehicleSize.FiveTon => 2200m,
        VehicleSize.TenTon => 3500m,
        VehicleSize.Lorry => 4500m,
        VehicleSize.Container => 6000m,
        VehicleSize.FreezerTruck => 3000m,
        VehicleSize.ChillerTruck => 2500m,
        VehicleSize.RefrigeratedVan => 1800m,
        _ => 800m
    };

    private static decimal GetPerKmRate(VehicleSize size) => size switch
    {
        VehicleSize.MiniTruck => 50m,
        VehicleSize.OneTon => 75m,
        VehicleSize.TwoTon => 100m,
        VehicleSize.ThreeTon => 125m,
        VehicleSize.FiveTon => 175m,
        VehicleSize.TenTon => 250m,
        VehicleSize.Lorry => 300m,
        VehicleSize.Container => 400m,
        VehicleSize.FreezerTruck => 220m,
        VehicleSize.ChillerTruck => 180m,
        VehicleSize.RefrigeratedVan => 130m,
        _ => 75m
    };

    private static decimal GetCargoSurcharge(CargoType cargoType) => cargoType switch
    {
        CargoType.Dry => 0m,
        CargoType.Chilled => 500m,
        CargoType.Frozen => 1000m,
        CargoType.Fragile => 300m,
        CargoType.Hazardous => 1500m,
        _ => 0m
    };
}
