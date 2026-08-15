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
        var totalCustomers = await _context.Users.CountAsync(u => u.Role == UserRole.Customer);
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
            totalCustomers,
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
    [HttpPost("drivers/{id:guid}/approve")]
    public async Task<IActionResult> VerifyDriver(Guid id, [FromBody] VerifyDriverDto dto)
    {
        var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.Id == id || d.UserId == id);
        if (driver == null) return NotFound(new { message = "Driver profile not found" });

        driver.IsApproved = dto.IsApproved;
        
        // Update linked vehicle records to Approved
        var vehicles = await _context.Vehicles.Where(v => v.DriverId == driver.Id || v.DriverId == driver.UserId).ToListAsync();
        foreach (var v in vehicles)
        {
            v.Status = dto.IsApproved ? VehicleStatus.Active : VehicleStatus.Inactive;
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = dto.IsApproved ? "Driver partner & vehicle approved successfully!" : "Driver verification status updated",
            driverId = driver.Id,
            isApproved = driver.IsApproved
        });
    }

    /// <summary>
    /// Gets all registered customers with total trip count and total spent (LKR).
    /// </summary>
    [HttpGet("customers")]
    public async Task<IActionResult> GetAllCustomers()
    {
        var customers = await _context.Users
            .AsNoTracking()
            .Where(u => u.Role == UserRole.Customer)
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();

        var customerIds = customers.Select(c => c.Id).ToList();

        var bookingStats = await _context.Bookings
            .AsNoTracking()
            .Where(b => customerIds.Contains(b.CustomerId))
            .GroupBy(b => b.CustomerId)
            .Select(g => new
            {
                CustomerId = g.Key,
                TripCount = g.Count(),
                TotalSpent = g.Sum(b => b.TotalFare)
            })
            .ToDictionaryAsync(x => x.CustomerId, x => x);

        var result = customers.Select(c => new
        {
            id = c.Id,
            fullName = c.FullName,
            email = c.Email,
            phoneNumber = c.PhoneNumber,
            totalTrips = bookingStats.TryGetValue(c.Id, out var stat) ? stat.TripCount : 0,
            totalSpent = Math.Round(bookingStats.TryGetValue(c.Id, out var stat2) ? stat2.TotalSpent : 0m, 2),
            isActive = c.IsActive,
            createdAt = c.CreatedAt
        });

        return Ok(result);
    }

    /// <summary>
    /// Toggles active/blocked status for a customer account.
    /// </summary>
    [HttpPost("customers/{id:guid}/toggle-status")]
    public async Task<IActionResult> ToggleCustomerStatus(Guid id)
    {
        var customer = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role == UserRole.Customer);
        if (customer == null) return NotFound(new { message = "Customer profile not found" });

        customer.IsActive = !customer.IsActive;
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = customer.IsActive ? "Customer account activated" : "Customer account suspended",
            customerId = customer.Id,
            isActive = customer.IsActive
        });
    }

    /// <summary>
    /// Gets complete directory of all driver partners.
    /// </summary>
    [HttpGet("drivers/all")]
    public async Task<IActionResult> GetAllDrivers()
    {
        var drivers = await _context.Drivers
            .Include(d => d.User)
            .AsNoTracking()
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();

        var result = drivers.Select(d => new
        {
            id = d.Id,
            userId = d.UserId,
            fullName = d.User?.FullName ?? "Driver Partner",
            email = d.User?.Email ?? "driver@truckme.lk",
            phoneNumber = d.User?.PhoneNumber ?? "+94770000000",
            licenseNumber = d.LicenseNumber,
            vehiclePlateNumber = d.VehiclePlateNumber ?? "WP-CAB-1234",
            vehicleType = d.VehicleType.ToString(),
            isOnline = d.IsOnline,
            isApproved = d.IsApproved,
            status = d.Status.ToString(),
            ratingAverage = d.RatingAverage > 0 ? d.RatingAverage : 4.9m,
            totalCompletedJobs = d.TotalCompletedJobs,
            totalEarnings = d.TotalEarnings,
            createdAt = d.CreatedAt
        });

        return Ok(result);
    }

    /// <summary>
    /// Gets global audit log of all bookings with full fare and cargo details across the platform.
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
            cargoType = b.CargoType.ToString(),
            cargoDescription = b.CargoDescription,
            cargoWeightKg = b.CargoWeightKg,
            baseFare = b.BaseFare,
            distanceFare = b.DistanceFare,
            addOnFare = b.AddOnFare,
            totalFare = b.TotalFare,
            driverPayout = b.DriverPayout,
            commission = b.Commission,
            status = b.Status.ToString(),
            createdAt = b.CreatedAt,
            completedAt = b.CompletedAt
        });

        return Ok(result);
    }

    /// <summary>
    /// Vehicle types management endpoints.
    /// </summary>
    [HttpGet("vehicle-types")]
    public IActionResult GetAdminVehicleTypes()
    {
        return RedirectToAction("GetVehicleTypes", "VehicleTypes");
    }

    [HttpPost("vehicle-types")]
    public IActionResult AddAdminVehicleType([FromBody] VehicleTypeDto dto)
    {
        return RedirectToAction("AddVehicleType", "VehicleTypes", dto);
    }

    [HttpPut("vehicle-types/{id}")]
    public IActionResult UpdateAdminVehicleType(string id, [FromBody] VehicleTypeDto dto)
    {
        return RedirectToAction("UpdateVehicleType", "VehicleTypes", new { id, dto });
    }

    [HttpDelete("vehicle-types/{id}")]
    public IActionResult DeleteAdminVehicleType(string id)
    {
        return RedirectToAction("DeleteVehicleType", "VehicleTypes", new { id });
    }
}

public class VerifyDriverDto
{
    public bool IsApproved { get; set; }
    public string? Remarks { get; set; }
}

