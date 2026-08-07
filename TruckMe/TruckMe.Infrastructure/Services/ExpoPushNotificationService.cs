using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using TruckMe.Application.Common.Interfaces;

namespace TruckMe.Infrastructure.Services;

public class ExpoPushNotificationService : IPushNotificationService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ExpoPushNotificationService> _logger;
    private const string ExpoPushUrl = "https://exp.host/--/api/v2/push/send";

    public ExpoPushNotificationService(
        HttpClient httpClient,
        ILogger<ExpoPushNotificationService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task SendPushNotificationAsync(
        string pushToken,
        string title,
        string message,
        object? data = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(pushToken)) return;

        var payload = new ExpoPushMessage
        {
            To = pushToken,
            Title = title,
            Body = message,
            Sound = "default",
            Priority = "high",
            Data = data
        };

        try
        {
            var response = await _httpClient.PostAsJsonAsync(ExpoPushUrl, payload, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to send Expo push notification to {Token}. StatusCode: {Code}", pushToken, response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending Expo push notification to {Token}", pushToken);
        }
    }

    public async Task SendBulkPushNotificationAsync(
        IEnumerable<string> pushTokens,
        string title,
        string message,
        object? data = null,
        CancellationToken cancellationToken = default)
    {
        var validTokens = pushTokens
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Distinct()
            .ToList();

        if (!validTokens.Any()) return;

        var payloadList = validTokens.Select(token => new ExpoPushMessage
        {
            To = token,
            Title = title,
            Body = message,
            Sound = "default",
            Priority = "high",
            Data = data
        }).ToList();

        try
        {
            var response = await _httpClient.PostAsJsonAsync(ExpoPushUrl, payloadList, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Failed to send bulk Expo push notifications. StatusCode: {Code}", response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending bulk Expo push notifications");
        }
    }
}

public class ExpoPushMessage
{
    [JsonPropertyName("to")]
    public string To { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("body")]
    public string Body { get; set; } = string.Empty;

    [JsonPropertyName("sound")]
    public string Sound { get; set; } = "default";

    [JsonPropertyName("priority")]
    public string Priority { get; set; } = "high";

    [JsonPropertyName("data")]
    public object? Data { get; set; }
}
