using MediatR;
using TruckMe.Application.DTOs;

namespace TruckMe.Application.Features.Routes.OptimizeRoute;

public class OptimizeRouteCommand : IRequest<RouteOptimizationResponse>
{
    public decimal OriginLatitude { get; set; }
    public decimal OriginLongitude { get; set; }
    public string OriginAddress { get; set; } = string.Empty;
    public List<DeliveryStopPointDto> Stops { get; set; } = new();
}

public class OptimizeRouteCommandHandler : IRequestHandler<OptimizeRouteCommand, RouteOptimizationResponse>
{
    public Task<RouteOptimizationResponse> Handle(OptimizeRouteCommand request, CancellationToken cancellationToken)
    {
        if (request.Stops.Count <= 1)
        {
            double singleDist = CalculateDistanceKm(
                (double)request.OriginLatitude, (double)request.OriginLongitude,
                (double)(request.Stops.FirstOrDefault()?.Latitude ?? request.OriginLatitude),
                (double)(request.Stops.FirstOrDefault()?.Longitude ?? request.OriginLongitude));

            return Task.FromResult(new RouteOptimizationResponse(
                request.Stops,
                (decimal)Math.Round(singleDist, 2),
                (int)Math.Ceiling(singleDist * 2.5),
                0m
            ));
        }

        // Nearest neighbor TSP heuristic for multi-drop route optimization
        var remaining = new List<DeliveryStopPointDto>(request.Stops);
        var optimized = new List<DeliveryStopPointDto>();

        double currLat = (double)request.OriginLatitude;
        double currLng = (double)request.OriginLongitude;
        double totalDist = 0;

        while (remaining.Count > 0)
        {
            DeliveryStopPointDto nearest = remaining[0];
            double minDist = double.MaxValue;

            foreach (var stop in remaining)
            {
                double d = CalculateDistanceKm(currLat, currLng, (double)stop.Latitude, (double)stop.Longitude);
                if (d < minDist)
                {
                    minDist = d;
                    nearest = stop;
                }
            }

            totalDist += minDist;
            currLat = (double)nearest.Latitude;
            currLng = (double)nearest.Longitude;
            optimized.Add(nearest);
            remaining.Remove(nearest);
        }

        // Estimate unoptimized distance for savings comparison
        double unoptimizedDist = 0;
        double prevLat = (double)request.OriginLatitude;
        double prevLng = (double)request.OriginLongitude;
        foreach (var stop in request.Stops)
        {
            unoptimizedDist += CalculateDistanceKm(prevLat, prevLng, (double)stop.Latitude, (double)stop.Longitude);
            prevLat = (double)stop.Latitude;
            prevLng = (double)stop.Longitude;
        }

        double distanceSaved = Math.Max(0, unoptimizedDist - totalDist);
        decimal fuelSavingsLkr = (decimal)(distanceSaved * 65.0); // 65 LKR fuel saved per km

        var response = new RouteOptimizationResponse(
            optimized,
            (decimal)Math.Round(totalDist, 2),
            (int)Math.Ceiling(totalDist * 2.2) + (optimized.Count * 15), // 15 mins drop time per stop
            Math.Round(fuelSavingsLkr, 2)
        );

        return Task.FromResult(response);
    }

    private static double CalculateDistanceKm(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371; // Earth radius in km
        var dLat = ToRadians(lat2 - lat1);
        var dLon = ToRadians(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }

    private static double ToRadians(double deg) => deg * (Math.PI / 180);
}
