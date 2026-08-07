using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using TruckMe.Application.Common.Interfaces;

namespace TruckMe.Infrastructure.Services;

public class GeoService : IGeoService
{
    private const double EarthRadiusKm = 6371.0;
    private readonly HttpClient _httpClient;
    private readonly string _googleKey;
    private readonly string _positionstackKey;

    public GeoService(IConfiguration configuration)
    {
        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "TruckMe-LogisticsApp/1.0");
        _googleKey = configuration["Maps:GoogleMapsApiKey"] ?? "AIzaSyCm3WMNIDcmRIk3MvKGv7vWUjNG2BFi6Cg";
        _positionstackKey = configuration["Maps:PositionstackApiKey"] ?? "615a0c0855fd3c204aed0f2d362694a5";
    }

    public Task<decimal> GetDistanceKmAsync(
        decimal lat1, decimal lon1,
        decimal lat2, decimal lon2)
    {
        double dLat = ToRadians((double)(lat2 - lat1));
        double dLon = ToRadians((double)(lon2 - lon1));

        double a =
            Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
            Math.Cos(ToRadians((double)lat1)) * Math.Cos(ToRadians((double)lat2)) *
            Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

        double c = 2.0 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1.0 - a));

        return Task.FromResult((decimal)(EarthRadiusKm * c));
    }

    public async Task<decimal> GetTotalDistanceKmAsync(
        List<(decimal lat, decimal lon)> points)
    {
        if (points.Count < 2)
            return 0m;

        decimal total = 0m;

        for (int i = 1; i < points.Count; i++)
        {
            total += await GetDistanceKmAsync(
                points[i - 1].lat, points[i - 1].lon,
                points[i].lat, points[i].lon);
        }

        return total;
    }

    public Task<int> GetEstimatedMinutesAsync(decimal distanceKm)
    {
        int minutes = (int)((double)distanceKm / 30.0 * 60.0);
        return Task.FromResult(minutes);
    }

    public async Task<(decimal lat, decimal lon)?> GeocodeAddressAsync(string address)
    {
        if (string.IsNullOrWhiteSpace(address)) return null;

        // 1. Try Google Maps Geocoding API
        if (!string.IsNullOrWhiteSpace(_googleKey) && !_googleKey.StartsWith("YOUR_"))
        {
            try
            {
                string googleUrl = $"https://maps.googleapis.com/maps/api/geocode/json?address={Uri.EscapeDataString(address)}&key={_googleKey}";
                var googleRes = await _httpClient.GetFromJsonAsync<GoogleGeocodeResponse>(googleUrl);
                var firstLocation = googleRes?.Results?.FirstOrDefault()?.Geometry?.Location;
                if (firstLocation != null)
                {
                    return (firstLocation.Lat, firstLocation.Lng);
                }
            }
            catch { }
        }

        // 2. Fallback to Positionstack
        try
        {
            string url = $"http://api.positionstack.com/v1/forward?access_key={_positionstackKey}&query={Uri.EscapeDataString(address)}";
            var response = await _httpClient.GetFromJsonAsync<PositionstackResponse>(url);
            var firstMatch = response?.Data?.FirstOrDefault();
            if (firstMatch != null && firstMatch.Latitude != 0 && firstMatch.Longitude != 0)
            {
                return (firstMatch.Latitude, firstMatch.Longitude);
            }
        }
        catch { }

        // 3. Fallback to OpenStreetMap Nominatim
        try
        {
            string osmUrl = $"https://nominatim.openstreetmap.org/search?format=json&q={Uri.EscapeDataString(address)}";
            var osmRes = await _httpClient.GetFromJsonAsync<List<NominatimGeocodeResult>>(osmUrl);
            var firstOsm = osmRes?.FirstOrDefault();
            if (firstOsm != null && decimal.TryParse(firstOsm.Lat, out decimal oLat) && decimal.TryParse(firstOsm.Lon, out decimal oLon))
            {
                return (oLat, oLon);
            }
        }
        catch { }

        return (6.927079m, 79.861244m);
    }

    public async Task<string?> ReverseGeocodeAsync(decimal lat, decimal lon)
    {
        // 1. Try Google Maps Reverse Geocoding API
        if (!string.IsNullOrWhiteSpace(_googleKey) && !_googleKey.StartsWith("YOUR_"))
        {
            try
            {
                string googleUrl = $"https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lon}&key={_googleKey}";
                var googleRes = await _httpClient.GetFromJsonAsync<GoogleGeocodeResponse>(googleUrl);
                var formattedAddress = googleRes?.Results?.FirstOrDefault()?.FormattedAddress;
                if (!string.IsNullOrWhiteSpace(formattedAddress))
                {
                    return formattedAddress;
                }
            }
            catch { }
        }

        // 2. Fallback to Positionstack
        try
        {
            string url = $"http://api.positionstack.com/v1/reverse?access_key={_positionstackKey}&query={lat},{lon}";
            var response = await _httpClient.GetFromJsonAsync<PositionstackResponse>(url);
            var firstMatch = response?.Data?.FirstOrDefault();
            if (firstMatch != null)
            {
                return firstMatch.Label ?? firstMatch.Name;
            }
        }
        catch { }

        // 3. Fallback to OpenStreetMap Nominatim
        try
        {
            string osmUrl = $"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}";
            var osmData = await _httpClient.GetFromJsonAsync<NominatimReverseResult>(osmUrl);
            if (!string.IsNullOrWhiteSpace(osmData?.DisplayName))
            {
                return osmData.DisplayName;
            }
        }
        catch { }

        return $"{lat:F4}, {lon:F4}";
    }

    private static double ToRadians(double degrees) => degrees * Math.PI / 180.0;

    private sealed class GoogleGeocodeResponse
    {
        [JsonPropertyName("results")]
        public List<GoogleGeocodeResult>? Results { get; set; }
    }

    private sealed class GoogleGeocodeResult
    {
        [JsonPropertyName("formatted_address")]
        public string? FormattedAddress { get; set; }

        [JsonPropertyName("geometry")]
        public GoogleGeometry? Geometry { get; set; }
    }

    private sealed class GoogleGeometry
    {
        [JsonPropertyName("location")]
        public GoogleLocation? Location { get; set; }
    }

    private sealed class GoogleLocation
    {
        [JsonPropertyName("lat")]
        public decimal Lat { get; set; }

        [JsonPropertyName("lng")]
        public decimal Lng { get; set; }
    }

    private sealed class PositionstackResponse
    {
        public List<PositionstackData>? Data { get; set; }
    }

    private sealed class PositionstackData
    {
        public decimal Latitude { get; set; }
        public decimal Longitude { get; set; }
        public string? Label { get; set; }
        public string? Name { get; set; }
    }

    private sealed class NominatimGeocodeResult
    {
        [JsonPropertyName("lat")]
        public string? Lat { get; set; }

        [JsonPropertyName("lon")]
        public string? Lon { get; set; }

        [JsonPropertyName("display_name")]
        public string? DisplayName { get; set; }
    }

    private sealed class NominatimReverseResult
    {
        [JsonPropertyName("display_name")]
        public string? DisplayName { get; set; }
    }
}
