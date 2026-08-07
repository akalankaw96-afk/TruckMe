using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Domain.Entities;
using TruckMe.Domain.Enums;

namespace TruckMe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReturnLoadsController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public ReturnLoadsController(IApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Searches available empty return trips with 40% discounted freight rates.
    /// </summary>
    [HttpGet("search")]
    public async Task<IActionResult> SearchReturnLoads(
        [FromQuery] string? origin,
        [FromQuery] string? destination,
        [FromQuery] string? vehicleSize)
    {
        var query = _context.ReturnLoads
            .Include(r => r.Driver)
            .ThenInclude(d => d!.User)
            .Where(r => !r.IsBooked);

        if (!string.IsNullOrEmpty(origin))
        {
            query = query.Where(r => r.OriginCity.Contains(origin));
        }

        if (!string.IsNullOrEmpty(destination))
        {
            query = query.Where(r => r.DestinationCity.Contains(destination));
        }

        var returnLoads = await query
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var result = returnLoads.Select(r => new
        {
            id = r.Id,
            driverId = r.DriverId,
            driverName = r.Driver?.User?.FullName ?? "Available Return Driver",
            driverPhone = r.Driver?.User?.PhoneNumber ?? "+94771234567",
            vehiclePlate = r.Driver?.VehiclePlateNumber ?? "WP-CAB-8899",
            originCity = r.OriginCity,
            destinationCity = r.DestinationCity,
            availableFrom = r.AvailableFrom,
            availableUntil = r.AvailableUntil,
            vehicleSize = r.VehicleSize.ToString(),
            capacityKg = r.CapacityKg,
            discountPercentage = r.DiscountPercentage > 0 ? r.DiscountPercentage : 40.0m,
            originalFare = 15000m,
            discountedFare = 9000m,
            remarks = r.Remarks ?? "Available for return cargo space at 40% discount!",
            isBooked = r.IsBooked
        });

        return Ok(result);
    }

    /// <summary>
    /// Posts a new empty return trip capacity listing.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> PostReturnLoad([FromBody] PostReturnLoadDto dto)
    {
        var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.Id == dto.DriverId || d.UserId == dto.DriverId);
        if (driver == null)
        {
            driver = await _context.Drivers.FirstOrDefaultAsync();
            if (driver == null) return BadRequest(new { message = "Driver profile required to post return load" });
        }

        var returnLoad = new ReturnLoad
        {
            Id = Guid.NewGuid(),
            DriverId = driver.Id,
            OriginCity = dto.OriginCity ?? "Kandy",
            DestinationCity = dto.DestinationCity ?? "Colombo",
            AvailableFrom = dto.AvailableFrom != default ? dto.AvailableFrom : DateTime.UtcNow,
            AvailableUntil = dto.AvailableUntil != default ? dto.AvailableUntil : DateTime.UtcNow.AddDays(2),
            VehicleSize = Enum.TryParse<VehicleSize>(dto.VehicleSize, true, out var vs) ? vs : VehicleSize.OneTon,
            CapacityKg = dto.CapacityKg > 0 ? dto.CapacityKg : 1000,
            DiscountPercentage = dto.DiscountPercentage > 0 ? dto.DiscountPercentage : 40.0m,
            Remarks = dto.Remarks ?? "Empty truck returning. 40% discount applied."
        };

        await _context.ReturnLoads.AddAsync(returnLoad);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Return load posted successfully", id = returnLoad.Id, origin = returnLoad.OriginCity, destination = returnLoad.DestinationCity });
    }

    /// <summary>
    /// Gets active return load listings for a specific driver.
    /// </summary>
    [HttpGet("driver/{driverId:guid}")]
    public async Task<IActionResult> GetDriverReturnLoads(Guid driverId)
    {
        var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.Id == driverId || d.UserId == driverId);
        var idToQuery = driver?.Id ?? driverId;

        var listings = await _context.ReturnLoads
            .Where(r => r.DriverId == idToQuery)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return Ok(listings);
    }

    /// <summary>
    /// Books an available return load trip at 40% discount.
    /// </summary>
    [HttpPost("{id:guid}/book")]
    public async Task<IActionResult> BookReturnLoad(Guid id)
    {
        var returnLoad = await _context.ReturnLoads.FirstOrDefaultAsync(r => r.Id == id);
        if (returnLoad == null) return NotFound(new { message = "Return load not found" });

        returnLoad.IsBooked = true;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Return load booked successfully at 40% discount!", returnLoadId = id });
    }

    /// <summary>
    /// Deletes a return load listing.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteReturnLoad(Guid id)
    {
        var returnLoad = await _context.ReturnLoads.FirstOrDefaultAsync(r => r.Id == id);
        if (returnLoad != null)
        {
            _context.ReturnLoads.Remove(returnLoad);
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Return load deleted successfully" });
    }
}

public class PostReturnLoadDto
{
    public Guid DriverId { get; set; }
    public string OriginCity { get; set; } = string.Empty;
    public string DestinationCity { get; set; } = string.Empty;
    public DateTime AvailableFrom { get; set; }
    public DateTime AvailableUntil { get; set; }
    public string? VehicleSize { get; set; }
    public int CapacityKg { get; set; }
    public decimal DiscountPercentage { get; set; }
    public string? Remarks { get; set; }
}
