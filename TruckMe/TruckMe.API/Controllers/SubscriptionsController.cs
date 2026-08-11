using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Interfaces;

namespace TruckMe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubscriptionsController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    // In-memory store for driver active subscriptions for quick validation
    private static readonly Dictionary<Guid, DriverSubscriptionState> _activeSubscriptions = new();

    public SubscriptionsController(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Gets available driver subscription plan tiers.
    /// </summary>
    [HttpGet("plans")]
    public IActionResult GetPlans()
    {
        var plans = new[]
        {
            new
            {
                id = "daily-pass",
                name = "⚡ Daily Driver Pass",
                price = 500m,
                currency = "LKR",
                durationDays = 1,
                commissionRate = 0.0m, // 0% Commission
                badge = "0% COMMISSION",
                description = "Keep 100% of all trip earnings for 24 hours. No platform commissions!"
            },
            new
            {
                id = "weekly-pro",
                name = "🚀 Weekly Pro Pass",
                price = 2500m,
                currency = "LKR",
                durationDays = 7,
                commissionRate = 0.0m, // 0% Commission
                badge = "POPULAR",
                description = "7 days of 0% platform commission + Priority dispatch alert on high-value jobs."
            },
            new
            {
                id = "monthly-fleet",
                name = "👑 Monthly Fleet Pass",
                price = 8500m,
                currency = "LKR",
                durationDays = 30,
                commissionRate = 0.0m, // 0% Commission
                badge = "BEST VALUE",
                description = "30 days of 0% platform commission + VIP Fleet Badge on driver profile."
            }
        };

        return Ok(plans);
    }

    /// <summary>
    /// Purchases and activates a driver subscription pass.
    /// </summary>
    [HttpPost("purchase")]
    public async Task<IActionResult> PurchaseSubscription([FromBody] PurchaseSubscriptionDto request)
    {
        var driver = await _context.Drivers
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.Id == request.DriverId || d.UserId == request.DriverId);

        if (driver == null) return NotFound("Driver profile not found");

        int durationDays = request.PlanId switch
        {
            "daily-pass" => 1,
            "weekly-pro" => 7,
            "monthly-fleet" => 30,
            _ => 1
        };

        decimal price = request.PlanId switch
        {
            "daily-pass" => 500m,
            "weekly-pro" => 2500m,
            "monthly-fleet" => 8500m,
            _ => 500m
        };

        var expiry = DateTime.UtcNow.AddDays(durationDays);

        var state = new DriverSubscriptionState
        {
            DriverId = driver.Id,
            PlanId = request.PlanId,
            PlanName = request.PlanId switch
            {
                "daily-pass" => "⚡ Daily Driver Pass",
                "weekly-pro" => "🚀 Weekly Pro Pass",
                "monthly-fleet" => "👑 Monthly Fleet Pass",
                _ => "Driver Pass"
            },
            PricePaid = price,
            ActivatedAt = DateTime.UtcNow,
            ExpiresAt = expiry,
            IsActive = true
        };

        _activeSubscriptions[driver.Id] = state;

        return Ok(new
        {
            success = true,
            message = $"Congratulations! Your {state.PlanName} is active until {expiry:yyyy-MM-dd HH:mm} UTC. Enjoy 0% commission on all trips!",
            subscription = new
            {
                driverId = driver.Id,
                planId = state.PlanId,
                planName = state.PlanName,
                commissionRate = 0.0,
                badge = "👑 VIP 0% COMMISSION ACTIVE",
                expiresAt = expiry
            }
        });
    }

    /// <summary>
    /// Retrieves current active subscription pass status for a driver.
    /// </summary>
    [HttpGet("active/{driverId:guid}")]
    public async Task<IActionResult> GetActiveSubscription(Guid driverId)
    {
        var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.Id == driverId || d.UserId == driverId);
        Guid targetId = driver?.Id ?? driverId;

        if (_activeSubscriptions.TryGetValue(targetId, out var sub) && sub.ExpiresAt > DateTime.UtcNow)
        {
            var remainingHours = Math.Round((sub.ExpiresAt - DateTime.UtcNow).TotalHours, 1);
            return Ok(new
            {
                hasActiveSubscription = true,
                planId = sub.PlanId,
                planName = sub.PlanName,
                commissionRate = 0.0,
                badge = "👑 VIP 0% COMMISSION ACTIVE",
                activatedAt = sub.ActivatedAt,
                expiresAt = sub.ExpiresAt,
                remainingHours = remainingHours,
                statusText = $"Active ({remainingHours} hours remaining)"
            });
        }

        return Ok(new
        {
            hasActiveSubscription = false,
            planId = (string?)null,
            planName = "Standard Commission (15%)",
            commissionRate = 0.15,
            badge = "STANDARD",
            statusText = "No active subscription pass"
        });
    }

    /// <summary>
    /// Helper method to check if a driver has an active 0% commission subscription.
    /// </summary>
    public static bool HasActiveSubscription(Guid driverId)
    {
        return _activeSubscriptions.TryGetValue(driverId, out var sub) && sub.ExpiresAt > DateTime.UtcNow;
    }
}

public class PurchaseSubscriptionDto
{
    public Guid DriverId { get; set; }
    public string PlanId { get; set; } = "daily-pass";
    public string? PaymentMethod { get; set; } = "Wallet";
}

public class DriverSubscriptionState
{
    public Guid DriverId { get; set; }
    public string PlanId { get; set; } = string.Empty;
    public string PlanName { get; set; } = string.Empty;
    public decimal PricePaid { get; set; }
    public DateTime ActivatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool IsActive { get; set; }
}
