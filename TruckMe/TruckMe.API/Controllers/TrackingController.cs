using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Interfaces;

namespace TruckMe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TrackingController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public TrackingController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("booking/{bookingId:guid}")]
    public async Task<IActionResult> GetBookingTracking(Guid bookingId)
    {
        var booking = await _context.Bookings
            .Include(b => b.Driver)
            .ThenInclude(d => d!.User)
            .FirstOrDefaultAsync(b => b.Id == bookingId);

        if (booking == null) return NotFound(new { message = "Booking not found" });

        var driver = booking.Driver;
        double driverLat = (double)(driver?.CurrentLatitude != 0 ? driver!.CurrentLatitude : (booking.PickupLatitude != 0 ? booking.PickupLatitude : 6.9271m));
        double driverLng = (double)(driver?.CurrentLongitude != 0 ? driver!.CurrentLongitude : (booking.PickupLongitude != 0 ? booking.PickupLongitude : 79.8612m));

        var points = new[]
        {
            new
            {
                latitude = driverLat,
                longitude = driverLng,
                speedKph = 38.0,
                headingDegrees = 180.0,
                batteryLevel = 95.0,
                capturedAt = (driver?.LastLocationUpdate ?? DateTime.UtcNow).ToString("o"),
                status = booking.Status.ToString(),
                driverName = driver?.User?.FullName ?? "Assigned Driver",
                driverPhone = driver?.User?.PhoneNumber ?? "+94778889999",
                vehiclePlate = driver?.VehiclePlateNumber ?? "WP-CAB-1234",
                vehicleType = driver?.VehicleType.ToString() ?? "Truck"
            }
        };

        return Ok(points);
    }

    [HttpPost]
    public async Task<IActionResult> PostGpsLocation([FromBody] PostGpsPointDto dto)
    {
        var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.Id == dto.DriverId || d.UserId == dto.DriverId);
        if (driver != null)
        {
            driver.CurrentLatitude = (decimal)dto.Latitude;
            driver.CurrentLongitude = (decimal)dto.Longitude;
            driver.LastLocationUpdate = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Location updated successfully", latitude = dto.Latitude, longitude = dto.Longitude });
    }
}

public class PostGpsPointDto
{
    public Guid BookingId { get; set; }
    public Guid DriverId { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public double SpeedKph { get; set; }
    public double HeadingDegrees { get; set; }
    public string? Status { get; set; }
}
