// Common/Interfaces/IGeoService.cs
namespace TruckMe.Application.Common.Interfaces;

public interface IGeoService
{
    Task<decimal> GetDistanceKmAsync(decimal lat1, decimal lon1, decimal lat2, decimal lon2);
    Task<decimal> GetTotalDistanceKmAsync(List<(decimal lat, decimal lon)> points);
    Task<int> GetEstimatedMinutesAsync(decimal distanceKm);
    Task<(decimal lat, decimal lon)?> GeocodeAddressAsync(string address);
    Task<string?> ReverseGeocodeAsync(decimal lat, decimal lon);
}
