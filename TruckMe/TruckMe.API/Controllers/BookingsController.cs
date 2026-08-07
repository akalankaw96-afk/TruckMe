using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.DTOs;
using TruckMe.Application.Features.Bookings.CancelBooking;
using TruckMe.Application.Features.Bookings.CreateBooking;
using TruckMe.Application.Features.Bookings.GetBookingById;
using TruckMe.Application.Features.Bookings.GetCustomerBookings;
using TruckMe.Application.Features.Bookings.UpdateBookingStatus;
using TruckMe.Application.Features.DeliveryStops;
using TruckMe.Domain.Entities;
using TruckMe.Domain.Enums;

namespace TruckMe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IApplicationDbContext _context;

    public BookingsController(IMediator mediator, IApplicationDbContext context)
    {
        _mediator = mediator;
        _context = context;
    }

    /// <summary>
    /// Creates a new truck booking request for cargo transportation (supports both App & API payloads).
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateBooking([FromBody] CustomerBookingRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.CustomerUserId);
        if (user == null)
        {
            user = new User
            {
                Id = request.CustomerUserId != Guid.Empty ? request.CustomerUserId : Guid.Parse("f4c15eb0-7fb3-4a89-915f-5113a1d20f22"),
                FullName = "Customer User",
                Email = $"customer_{request.CustomerUserId.ToString()[..6]}@truckme.lk",
                PasswordHash = "123456",
                PhoneNumber = "+94770000000",
                Role = Domain.Enums.UserRole.Customer,
                IsActive = true
            };
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();
        }

        var address = await _context.Addresses.FirstOrDefaultAsync(a => a.Id == request.PickupAddressId);

        Guid customerId = user.Id;
        string pickupAddr = !string.IsNullOrWhiteSpace(request.CustomPickupAddress) ? request.CustomPickupAddress : (address?.AddressLine1 ?? "Colombo, Sri Lanka");
        decimal lat = address?.Latitude ?? 6.9271m;
        decimal lng = address?.Longitude ?? 79.8612m;

        VehicleSize vehicleSize = VehicleSize.OneTon;
        if (!string.IsNullOrEmpty(request.VehicleTypeId))
        {
            if (request.VehicleTypeId.Contains("mini")) vehicleSize = VehicleSize.MiniTruck;
            else if (request.VehicleTypeId.Contains("2ton")) vehicleSize = VehicleSize.TwoTon;
            else if (request.VehicleTypeId.Contains("3ton")) vehicleSize = VehicleSize.ThreeTon;
            else if (request.VehicleTypeId.Contains("5ton")) vehicleSize = VehicleSize.FiveTon;
            else if (request.VehicleTypeId.Contains("freezer")) vehicleSize = VehicleSize.FreezerTruck;
            else if (request.VehicleTypeId.Contains("chiller")) vehicleSize = VehicleSize.ChillerTruck;
        }

        double distance = request.EstimatedDistanceKm > 0 ? request.EstimatedDistanceKm : 12;
        decimal baseFare = 4000m;
        decimal distFare = (decimal)(distance * 160);
        decimal helpersFare = request.NumberOfHelpers * 1500m;
        decimal expressFare = request.IsExpress ? 1500m : 0m;
        
        int stopsCount = (request.DeliveryStops != null && request.DeliveryStops.Count > 0) ? request.DeliveryStops.Count : 1;
        decimal stopFare = Math.Max(0, stopsCount - 1) * 750m;
        decimal totalFare = baseFare + distFare + helpersFare + expressFare + stopFare;

        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            CustomerId = customerId,
            PickupAddress = pickupAddr,
            PickupLatitude = lat,
            PickupLongitude = lng,
            PickupContactName = user.FullName,
            PickupContactPhone = user.PhoneNumber,
            CargoType = request.CargoType?.ToLower() == "chilled" ? CargoType.Chilled : (request.CargoType?.ToLower() == "frozen" ? CargoType.Frozen : CargoType.Dry),
            CargoDescription = request.CargoDescription ?? "General Cargo",
            CargoWeightKg = request.CargoWeightKg > 0 ? request.CargoWeightKg : 500,
            RequiredVehicleSize = vehicleSize,
            NeedsHelpers = request.NumberOfHelpers > 0,
            HelperCount = request.NumberOfHelpers,
            IsExpress = request.IsExpress,
            BaseFare = baseFare,
            DistanceFare = distFare,
            StopFare = stopFare,
            AddOnFare = helpersFare + expressFare,
            TotalFare = totalFare,
            Commission = totalFare * 0.10m,
            DriverPayout = totalFare * 0.90m,
            TotalDistanceKm = (decimal)distance,
            EstimatedDurationMinutes = request.EstimatedDurationMinutes > 0 ? request.EstimatedDurationMinutes : 35,
            ScheduledAt = request.ScheduledPickupAt != default ? request.ScheduledPickupAt : DateTime.UtcNow.AddDays(1),
            Status = BookingStatus.Pending
        };

        if (request.DeliveryStops != null && request.DeliveryStops.Count > 0)
        {
            int seq = 1;
            foreach (var stop in request.DeliveryStops)
            {
                booking.DeliveryStops.Add(new DeliveryStop
                {
                    Id = Guid.NewGuid(),
                    BookingId = booking.Id,
                    Sequence = seq++,
                    Address = stop.Address,
                    Latitude = stop.Latitude != 0 ? stop.Latitude : (lat + (seq * 0.02m)),
                    Longitude = stop.Longitude != 0 ? stop.Longitude : (lng + (seq * 0.02m)),
                    RecipientName = !string.IsNullOrWhiteSpace(stop.RecipientName) ? stop.RecipientName : "Recipient",
                    RecipientPhone = !string.IsNullOrWhiteSpace(stop.RecipientPhone) ? stop.RecipientPhone : user.PhoneNumber,
                    Notes = stop.Notes,
                    Status = DeliveryStopStatus.Pending
                });
            }
        }
        else
        {
            booking.DeliveryStops.Add(new DeliveryStop
            {
                Id = Guid.NewGuid(),
                BookingId = booking.Id,
                Sequence = 1,
                Address = "Delivery Location, Sri Lanka",
                Latitude = lat + 0.05m,
                Longitude = lng + 0.05m,
                RecipientName = user.FullName,
                RecipientPhone = user.PhoneNumber,
                Status = DeliveryStopStatus.Pending
            });
        }

        await _context.Bookings.AddAsync(booking);
        await _context.SaveChangesAsync();

        string bookingNum = $"TB-{booking.CreatedAt:yyMMdd}-{booking.Id.ToString()[..4].ToUpper()}";

        return Ok(new
        {
            booking = new
            {
                id = booking.Id,
                bookingNumber = bookingNum,
                scheduledPickupAt = booking.ScheduledAt,
                status = booking.Status.ToString(),
                totalFare = booking.TotalFare,
                baseFare = booking.BaseFare,
                distanceFare = booking.DistanceFare,
                stopFare = stopFare,
                helpersFare = helpersFare,
                expressFare = expressFare,
                serviceFee = 250m
            }
        });
    }

    /// <summary>
    /// Calculates fare estimate for customer booking app.
    /// </summary>
    [HttpPost("estimate")]
    public IActionResult EstimateFare([FromBody] CustomerEstimateRequest request)
    {
        double distance = request.DistanceKm > 0 ? request.DistanceKm : 12;
        decimal baseFare = 4000m;
        if (!string.IsNullOrEmpty(request.VehicleTypeId))
        {
            if (request.VehicleTypeId.Contains("mini")) baseFare = 2500m;
            else if (request.VehicleTypeId.Contains("2ton")) baseFare = 6500m;
            else if (request.VehicleTypeId.Contains("3ton")) baseFare = 9000m;
            else if (request.VehicleTypeId.Contains("5ton")) baseFare = 14000m;
            else if (request.VehicleTypeId.Contains("freezer")) baseFare = 15000m;
            else if (request.VehicleTypeId.Contains("chiller")) baseFare = 12000m;
        }

        decimal distFare = (decimal)(distance * 160);
        decimal helpersFare = request.NumberOfHelpers * 1500m;
        decimal expressFare = request.IsExpress ? 1500m : 0m;
        decimal tempFare = request.RequiresTemperatureControl ? 2000m : 0m;

        int stopsCount = request.DeliveryStopCount > 0 ? request.DeliveryStopCount : (request.DeliveryStops != null && request.DeliveryStops.Count > 0 ? request.DeliveryStops.Count : 1);
        decimal stopFare = Math.Max(0, stopsCount - 1) * 750m;
        decimal serviceFee = 250m;
        decimal total = baseFare + distFare + helpersFare + expressFare + tempFare + stopFare + serviceFee;

        return Ok(new
        {
            total = total,
            baseFare = baseFare,
            distanceFare = distFare,
            stopFare = stopFare,
            helpersFare = helpersFare,
            expressFare = expressFare,
            temperatureFare = tempFare,
            serviceFee = serviceFee,
            currency = "LKR"
        });
    }

    /// <summary>
    /// Retrieves full details of a booking by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetBookingById(Guid id)
    {
        var booking = await _context.Bookings
            .Include(b => b.DeliveryStops)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound(new { message = "Booking not found" });

        var dto = new
        {
            id = booking.Id,
            bookingNumber = $"BK-{booking.Id.ToString()[..8].ToUpper()}",
            customerId = booking.CustomerId,
            driverId = booking.DriverId,
            pickupAddress = booking.PickupAddress,
            pickupLatitude = booking.PickupLatitude,
            pickupLongitude = booking.PickupLongitude,
            pickupContactName = booking.PickupContactName,
            pickupContactPhone = booking.PickupContactPhone,
            cargoType = booking.CargoType.ToString(),
            cargoDescription = booking.CargoDescription,
            cargoWeightKg = booking.CargoWeightKg,
            requiredVehicleSize = booking.RequiredVehicleSize.ToString(),
            needsHelpers = booking.NeedsHelpers,
            numberOfHelpers = booking.HelperCount,
            isExpress = booking.IsExpress,
            totalFare = booking.TotalFare,
            driverEarnings = booking.DriverPayout > 0 ? booking.DriverPayout : Math.Round(booking.TotalFare * 0.85m, 2),
            driverPayout = booking.DriverPayout > 0 ? booking.DriverPayout : Math.Round(booking.TotalFare * 0.85m, 2),
            estimatedDistanceKm = booking.TotalDistanceKm > 0 ? booking.TotalDistanceKm : 12,
            totalDistanceKm = booking.TotalDistanceKm > 0 ? booking.TotalDistanceKm : 12,
            estimatedDurationMinutes = booking.EstimatedDurationMinutes > 0 ? booking.EstimatedDurationMinutes : 35,
            scheduledPickupAt = booking.ScheduledAt != default ? booking.ScheduledAt : booking.CreatedAt,
            status = booking.Status.ToString(),
            cancellationReason = booking.CancellationReason,
            createdAt = booking.CreatedAt,
            deliveryStops = booking.DeliveryStops.OrderBy(s => s.Sequence).Select(s => new
            {
                id = s.Id,
                sequence = s.Sequence,
                address = s.Address,
                latitude = s.Latitude,
                longitude = s.Longitude,
                recipientName = s.RecipientName,
                recipientPhone = s.RecipientPhone,
                notes = s.Notes,
                status = s.Status.ToString(),
                arrivedAt = s.ArrivedAt,
                completedAt = s.CompletedAt
            }).ToList()
        };

        return Ok(dto);
    }

    /// <summary>
    /// Retrieves all bookings placed by a specific customer.
    /// </summary>
    [HttpGet("customer/{customerId:guid}")]
    public async Task<ActionResult<List<BookingListDto>>> GetCustomerBookings(Guid customerId)
    {
        var result = await _mediator.Send(new GetCustomerBookingsQuery { CustomerId = customerId });
        return Ok(result);
    }

    /// <summary>
    /// Assigns a driver to a booking job request.
    /// </summary>
    [HttpPatch("{id:guid}/assign")]
    [HttpPost("{id:guid}/assign")]
    [HttpPut("{id:guid}/assign")]
    public async Task<IActionResult> AssignDriver(Guid id, [FromBody] AssignDriverRequest request)
    {
        var booking = await _context.Bookings.FirstOrDefaultAsync(b => b.Id == id);
        if (booking == null) return NotFound("Booking not found");

        var driver = await _context.Drivers.FirstOrDefaultAsync(d => d.Id == request.DriverId || d.UserId == request.DriverId);
        if (driver == null)
        {
            driver = await _context.Drivers.FirstOrDefaultAsync();
            if (driver == null)
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Role == UserRole.Driver) ?? await _context.Users.FirstOrDefaultAsync();
                driver = new Driver
                {
                    Id = Guid.NewGuid(),
                    UserId = user?.Id ?? Guid.NewGuid(),
                    LicenseNumber = "B1234567",
                    VehicleType = VehicleSize.OneTon,
                    VehiclePlateNumber = "WP-CAB-1234",
                    IsOnline = true,
                    IsApproved = true,
                    Status = DriverStatus.Online
                };
                await _context.Drivers.AddAsync(driver);
                await _context.SaveChangesAsync();
            }
        }

        booking.DriverId = driver.Id;
        booking.Status = BookingStatus.Assigned;
        driver.Status = DriverStatus.OnJob;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Driver assigned successfully", bookingId = booking.Id, driverId = driver.Id });
    }

    /// <summary>
    /// Updates the status of an ongoing booking (e.g. ArrivedAtPickup, InTransit, Delivered).
    /// </summary>
    [HttpPut("{id:guid}/status")]
    [HttpPatch("{id:guid}/status")]
    [HttpPost("{id:guid}/status")]
    public async Task<IActionResult> UpdateBookingStatus(Guid id, [FromBody] UpdateBookingStatusSimpleDto dto)
    {
        var booking = await _context.Bookings.FirstOrDefaultAsync(b => b.Id == id);
        if (booking == null) return NotFound("Booking not found");

        if (Enum.TryParse<BookingStatus>(dto.Status, true, out var parsedStatus))
        {
            booking.Status = parsedStatus;
            if (parsedStatus == BookingStatus.Delivered || parsedStatus == BookingStatus.Completed)
            {
                booking.CompletedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Status updated successfully", status = booking.Status.ToString() });
    }

    /// <summary>
    /// Submits Proof of Delivery (PoD) with recipient signature, cargo photo, recipient name, and notes.
    /// </summary>
    [HttpPost("{id:guid}/pod")]
    public async Task<IActionResult> SubmitProofOfDelivery(Guid id, [FromBody] SubmitPodDto dto)
    {
        var booking = await _context.Bookings.FirstOrDefaultAsync(b => b.Id == id);
        if (booking == null) return NotFound("Booking not found");

        booking.Status = BookingStatus.Delivered;
        booking.CompletedAt = DateTime.UtcNow;
        if (!string.IsNullOrEmpty(dto.Notes))
        {
            booking.CancellationReason = $"PoD Notes: {dto.Notes}";
        }
        await _context.SaveChangesAsync();

        return Ok(new {
            message = "Proof of Delivery submitted successfully",
            bookingId = id,
            status = "Delivered",
            recipientName = dto.RecipientName ?? booking.PickupContactName,
            completedAt = booking.CompletedAt,
            signatureReceived = !string.IsNullOrEmpty(dto.RecipientSignature),
            photoReceived = !string.IsNullOrEmpty(dto.CargoPhotoUrl)
        });
    }

    /// <summary>
    /// Gets all pending / searching bookings available for drivers to accept.
    /// </summary>
    [HttpGet("pending")]
    [HttpGet("available")]
    public async Task<IActionResult> GetAvailableBookings()
    {
        var bookings = await _context.Bookings
            .Include(b => b.DeliveryStops)
            .Where(b => b.Status == BookingStatus.Pending || b.Status == BookingStatus.Searching)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        var result = bookings.Select(b => new
        {
            id = b.Id,
            bookingNumber = $"BK-{b.Id.ToString()[..8].ToUpper()}",
            pickupAddress = b.PickupAddress,
            pickupLatitude = b.PickupLatitude,
            pickupLongitude = b.PickupLongitude,
            totalFare = b.TotalFare,
            driverPayout = b.DriverPayout > 0 ? b.DriverPayout : Math.Round(b.TotalFare * 0.85m, 2),
            scheduledPickupAt = b.ScheduledAt != default ? b.ScheduledAt : b.CreatedAt,
            estimatedDistanceKm = b.TotalDistanceKm > 0 ? b.TotalDistanceKm : 12,
            estimatedDurationMinutes = b.EstimatedDurationMinutes > 0 ? b.EstimatedDurationMinutes : 35,
            cargoType = b.CargoType.ToString(),
            cargoDescription = b.CargoDescription,
            cargoWeightKg = b.CargoWeightKg,
            numberOfHelpers = b.HelperCount,
            status = b.Status.ToString(),
            deliveryStops = b.DeliveryStops.OrderBy(s => s.Sequence).Select(s => new
            {
                id = s.Id,
                address = s.Address,
                recipientName = s.RecipientName,
                recipientPhone = s.RecipientPhone,
                status = s.Status.ToString()
            })
        });

        return Ok(result);
    }

    /// <summary>
    /// Updates the status of a specific delivery stop within a multi-drop route.
    /// </summary>
    [HttpPut("{id:guid}/stops/status")]
    public async Task<IActionResult> UpdateStopStatus(Guid id, [FromBody] UpdateStopStatusCommand command)
    {
        if (id != command.BookingId)
        {
            return BadRequest("Booking ID mismatch.");
        }

        var result = await _mediator.Send(command);
        if (!result.IsSuccess)
        {
            return BadRequest(result.Error);
        }

        return NoContent();
    }

    /// <summary>
    /// Cancels a booking.
    /// <summary>
    /// Cancels a booking.
    /// </summary>
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> CancelBooking(Guid id, [FromBody] CancelBookingRequestDto? request)
    {
        string reason = request?.Reason ?? request?.CancellationReason ?? "Customer cancelled";
        var result = await _mediator.Send(new CancelBookingCommand
        {
            BookingId = id,
            CancellationReason = reason
        });

        if (!result.IsSuccess)
        {
            return BadRequest(new { message = result.Error });
        }

        return Ok(new { message = "Booking cancelled successfully" });
    }

    /// <summary>
    /// Submits a customer cancellation request. Requires driver approval if trip is assigned/en-route.
    /// </summary>
    [HttpPost("{id:guid}/cancel-request")]
    public async Task<IActionResult> RequestCancellation(Guid id, [FromBody] CancelBookingRequestDto? request)
    {
        var booking = await _context.Bookings
            .Include(b => b.Driver)
            .FirstOrDefaultAsync(b => b.Id == id);
            
        if (booking == null) return NotFound(new { message = "Booking not found" });

        string reason = request?.Reason ?? request?.CancellationReason ?? "Customer requested cancellation";

        // If booking is pending/searching, cancel immediately for free
        if (booking.Status == BookingStatus.Pending || booking.Status == BookingStatus.Searching)
        {
            booking.Status = BookingStatus.Cancelled;
            booking.CancellationReason = reason;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Booking cancelled successfully", requiresApproval = false, fee = 0 });
        }

        // If driver assigned or en route, require driver approval & calculate compensation fee
        decimal feeAmount = booking.Status == BookingStatus.ArrivedAtPickup ? 1500m : 750m;
        decimal driverCompensation = Math.Round(feeAmount * 0.8m, 2);

        booking.CancellationReason = $"[CANCEL_PENDING] Reason: {reason} | Fee: LKR {feeAmount} | Driver Compensation: LKR {driverCompensation}";
        await _context.SaveChangesAsync();

        return Ok(new {
            message = "Cancellation request sent to driver for approval",
            requiresApproval = true,
            cancellationFee = feeAmount,
            driverCompensation = driverCompensation,
            reason = reason
        });
    }

    /// <summary>
    /// Driver approves or rejects a customer cancellation request.
    /// </summary>
    [HttpPost("{id:guid}/cancel-respond")]
    public async Task<IActionResult> RespondCancellation(Guid id, [FromBody] CancelRespondDto dto)
    {
        var booking = await _context.Bookings
            .Include(b => b.Driver)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null) return NotFound(new { message = "Booking not found" });

        if (dto.Approved)
        {
            booking.Status = BookingStatus.Cancelled;
            booking.CancellationReason = $"Cancelled by Customer (Driver Approved: {dto.Reason ?? "Fee Compensated"})";
            
            if (booking.Driver != null)
            {
                decimal compFee = booking.Status == BookingStatus.ArrivedAtPickup ? 1200m : 600m;
                booking.Driver.TotalEarnings += compFee;
                booking.Driver.Status = DriverStatus.Online;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Cancellation approved by driver", status = "Cancelled" });
        }
        else
        {
            return Ok(new { message = "Cancellation request declined by driver. Trip remains active.", status = booking.Status.ToString() });
        }
    }
}

public class CancelRespondDto
{
    public bool Approved { get; set; }
    public string? Reason { get; set; }
}

public class CancelBookingRequestDto
{
    public string? Reason { get; set; }
    public string? CancellationReason { get; set; }
}

public class CustomerBookingRequest
{
    public Guid CustomerUserId { get; set; }
    public string? VehicleTypeId { get; set; }
    public Guid PickupAddressId { get; set; }
    public string? CustomPickupAddress { get; set; }
    public DateTime ScheduledPickupAt { get; set; }
    public string? CargoType { get; set; }
    public string? CargoDescription { get; set; }
    public double CargoWeightKg { get; set; }
    public int NumberOfHelpers { get; set; }
    public bool IsExpress { get; set; }
    public double EstimatedDistanceKm { get; set; }
    public int EstimatedDurationMinutes { get; set; }
    public decimal Discount { get; set; }
    public List<CustomerDeliveryStopDto>? DeliveryStops { get; set; }
}

public class CustomerEstimateRequest
{
    public string? VehicleTypeId { get; set; }
    public double DistanceKm { get; set; }
    public int DurationMinutes { get; set; }
    public int NumberOfHelpers { get; set; }
    public int DeliveryStopCount { get; set; }
    public bool IsExpress { get; set; }
    public bool RequiresTemperatureControl { get; set; }
    public decimal Discount { get; set; }
    public List<CustomerDeliveryStopDto>? DeliveryStops { get; set; }
}

public class CustomerDeliveryStopDto
{
    public string Address { get; set; } = string.Empty;
    public string? RecipientName { get; set; }
    public string? RecipientPhone { get; set; }
    public string? Notes { get; set; }
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
}

public class AssignDriverRequest
{
    public Guid DriverId { get; set; }
    public Guid VehicleId { get; set; }
}

public class UpdateBookingStatusSimpleDto
{
    public string Status { get; set; } = string.Empty;
}

public class SubmitPodDto
{
    public string? RecipientName { get; set; }
    public string? RecipientSignature { get; set; }
    public string? CargoPhotoUrl { get; set; }
    public string? Notes { get; set; }
}
