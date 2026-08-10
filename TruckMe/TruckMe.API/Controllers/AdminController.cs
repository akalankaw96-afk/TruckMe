using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Domain.Enums;

namespace TruckMe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AdminController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public AdminController(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Gets executive analytics & platform KPI metrics.
    /// </summary>
    [HttpGet("dashboard-stats")]
    public async Task<IActionResult> GetDashboardStats()
    {
        var totalBookings = await _context.Bookings.CountAsync();
        var completedDeliveries = await _context.Bookings.CountAsync(b => b.Status == BookingStatus.Delivered || b.Status == BookingStatus.Completed);
        var activeDeliveries = await _context.Bookings.CountAsync(b => b.Status == BookingStatus.Assigned || b.Status == BookingStatus.InTransit);
        
        var totalRevenue = await _context.Bookings
            .Where(b => b.Status == BookingStatus.Delivered || b.Status == BookingStatus.Completed)
            .SumAsync(b => b.TotalFare);

        var platformCommission = await _context.Bookings
            .Where(b => b.Status == BookingStatus.Delivered || b.Status == BookingStatus.Completed)
            .SumAsync(b => b.Commission > 0 ? b.Commission : b.TotalFare * 0.15m);

        var totalDrivers = await _context.Drivers.CountAsync();
        var onlineDrivers = await _context.Drivers.CountAsync(d => d.IsOnline);
        var pendingApprovals = await _context.Drivers.CountAsync(d => !d.IsApproved);

        return Ok(new
        {
            totalBookings,
            completedDeliveries,
            activeDeliveries,
            totalRevenue = Math.Round(totalRevenue, 2),
            platformCommission = Math.Round(platformCommission, 2),
            totalDrivers,
            onlineDrivers,
            pendingApprovals,
            timestamp = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Retrieves real-time active driver fleet locations for live fleet map.
    /// </summary>
    [HttpGet("live-fleet")]
    public async Task<IActionResult> GetLiveFleet()
    {
        var drivers = await _context.Drivers
            .Include(d => d.User)
            .AsNoTracking()
            .ToListAsync();

        var fleet = drivers.Select(d => new
        {
            id = d.Id,
            driverName = d.User?.FullName ?? "Driver Partner",
            phone = d.User?.PhoneNumber ?? "+94771234567",
            licenseNumber = d.LicenseNumber,
            vehiclePlateNumber = d.VehiclePlateNumber ?? "WP-CAB-1234",
            vehicleType = d.VehicleType.ToString(),
            latitude = d.CurrentLatitude != 0 ? d.CurrentLatitude : 6.9271m,
            longitude = d.CurrentLongitude != 0 ? d.CurrentLongitude : 79.8612m,
            isOnline = d.IsOnline,
            isApproved = d.IsApproved,
            status = d.Status.ToString(),
            ratingAverage = d.RatingAverage > 0 ? d.RatingAverage : 4.9m,
            totalEarnings = d.TotalEarnings,
            lastLocationUpdate = d.LastLocationUpdate
        });

        return Ok(fleet);
    }

    /// <summary>
    /// Retrieves drivers waiting for admin license & KYC verification.
    /// </summary>
    [HttpGet("drivers/pending-approval")]
    public async Task<IActionResult> GetPendingDriverApprovals()
    {
        var pendingDrivers = await _context.Drivers
            .Include(d => d.User)
            .Where(d => !d.IsApproved)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();

        var result = pendingDrivers.Select(d => new
        {
            id = d.Id,
            fullName = d.User?.FullName ?? "Driver Applicant",
            email = d.User?.Email,
            phone = d.User?.PhoneNumber,
            licenseNumber = d.LicenseNumber,
            licenseImageUrl = d.LicenseImageUrl ?? "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=500",
            vehiclePlateNumber = d.VehiclePlateNumber,
            vehicleType = d.VehicleType.ToString(),
            createdAt = d.CreatedAt,
            isApproved = d.IsApproved
        });

        return Ok(result);
    }

    /// <summary>
    /// Approves or rejects a driver's KYC license verification.
    /// </summary>
    [HttpPost("drivers/{id:guid}/verify")]
    public async Task<IActionResult> VerifyDriver(Guid id, [FromBody] VerifyDriverDto dto)
    {
        var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.Id == id || d.UserId == id);
        if (driver == null) return NotFound("Driver profile not found");

        driver.IsApproved = dto.IsApproved;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = dto.IsApproved ? "Driver license approved successfully" : "Driver verification updated",
            driverId = driver.Id,
            isApproved = driver.IsApproved
        });
    }

    /// <summary>
    /// Gets global audit log of all bookings across the platform.
    /// </summary>
    [HttpGet("bookings")]
    public async Task<IActionResult> GetAllBookings([FromQuery] string? status)
    {
        var query = _context.Bookings
            .Include(b => b.Driver)
            .ThenInclude(d => d!.User)
            .AsNoTracking();

        if (!string.IsNullOrEmpty(status) && Enum.TryParse<BookingStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(b => b.Status == parsedStatus);
        }

        var bookings = await query.OrderByDescending(b => b.CreatedAt).ToListAsync();

        var result = bookings.Select(b => new
        {
            id = b.Id,
            bookingNumber = $"TB-{b.CreatedAt:yyMMdd}-{b.Id.ToString()[..4].ToUpper()}",
            pickupAddress = b.PickupAddress,
            customerName = b.PickupContactName,
            customerPhone = b.PickupContactPhone,
            driverName = b.Driver?.User?.FullName ?? "Unassigned",
            driverPhone = b.Driver?.User?.PhoneNumber ?? "N/A",
            vehiclePlate = b.Driver?.VehiclePlateNumber ?? "N/A",
            totalFare = b.TotalFare,
            status = b.Status.ToString(),
            createdAt = b.CreatedAt,
            completedAt = b.CompletedAt
        });

        return Ok(result);
    }
}

public class VerifyDriverDto
{
    public bool IsApproved { get; set; }
    public string? Remarks { get; set; }
}
