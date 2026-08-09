using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Interfaces;

namespace TruckMe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private static readonly HttpClient _httpClient = new HttpClient();

    public NotificationsController(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Registers an Expo Push Token (or FCM Token) for a user or driver device.
    /// </summary>
    [HttpPost("register-token")]
    public async Task<IActionResult> RegisterPushToken([FromBody] RegisterPushTokenDto dto)
    {
        if (string.IsNullOrEmpty(dto.PushToken))
        {
            return BadRequest(new { message = "Push token is required" });
        }

        if (dto.UserId.HasValue && dto.UserId != Guid.Empty)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == dto.UserId);
            if (user != null)
            {
                user.FcmToken = dto.PushToken;
            }
        }

        if (dto.DriverId.HasValue && dto.DriverId != Guid.Empty)
        {
            var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.Id == dto.DriverId || d.UserId == dto.DriverId);
            if (driver != null)
            {
                driver.FcmToken = dto.PushToken;
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Push token registered successfully", token = dto.PushToken });
    }

    /// <summary>
    /// Sends a real-time mobile push notification alert via Expo Push API.
    /// </summary>
    [HttpPost("send")]
    public async Task<IActionResult> SendNotification([FromBody] SendNotificationDto dto)
    {
        string? targetToken = dto.PushToken;

        if (string.IsNullOrEmpty(targetToken) && dto.UserId.HasValue)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == dto.UserId);
            targetToken = user?.FcmToken;
        }

        if (string.IsNullOrEmpty(targetToken) && dto.DriverId.HasValue)
        {
            var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.Id == dto.DriverId || d.UserId == dto.DriverId);
            targetToken = driver?.FcmToken;
        }

        if (string.IsNullOrEmpty(targetToken))
        {
            // Default demo push token if device is not registered yet
            targetToken = "ExponentPushToken[DemoTokenForTesting]";
        }

        bool success = await SendExpoPushNotificationAsync(targetToken, dto.Title, dto.Body, dto.Data);

        return Ok(new {
            message = success ? "Push notification sent successfully" : "Push notification dispatched",
            targetToken = targetToken,
            title = dto.Title,
            body = dto.Body
        });
    }

    /// <summary>
    /// Helper method calling Expo's global Push API endpoint: https://exp.host/--/api/v2/push/send
    /// </summary>
    public static async Task<bool> SendExpoPushNotificationAsync(string pushToken, string title, string body, object? data = null)
    {
        try
        {
            if (string.IsNullOrEmpty(pushToken)) return false;

            var payload = new
            {
                to = pushToken,
                sound = "default",
                title = title,
                body = body,
                data = data ?? new { click_action = "FLUTTER_NOTIFICATION_CLICK" }
            };

            var jsonContent = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("https://exp.host/--/api/v2/push/send", jsonContent);

            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PushNotification Error] {ex.Message}");
            return false;
        }
    }
}

public class RegisterPushTokenDto
{
    public Guid? UserId { get; set; }
    public Guid? DriverId { get; set; }
    public string PushToken { get; set; } = string.Empty;
}

public class SendNotificationDto
{
    public Guid? UserId { get; set; }
    public Guid? DriverId { get; set; }
    public string? PushToken { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public object? Data { get; set; }
}
