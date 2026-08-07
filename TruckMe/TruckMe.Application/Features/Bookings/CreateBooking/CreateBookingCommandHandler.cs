using MediatR;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Exceptions;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.DTOs;
using TruckMe.Application.Features.Estimates.EstimateBooking;
using TruckMe.Domain.Entities;
using TruckMe.Domain.Enums;
using TruckMe.Domain.Interfaces;

namespace TruckMe.Application.Features.Bookings.CreateBooking;

public sealed class CreateBookingCommandHandler : IRequestHandler<CreateBookingCommand, BookingResponse>
{
    private readonly IUserRepository _userRepository;
    private readonly IBookingRepository _bookingRepository;
    private readonly INotificationService _notificationService;
    private readonly IPushNotificationService _pushNotificationService;
    private readonly IApplicationDbContext _context;
    private readonly IMediator _mediator;

    public CreateBookingCommandHandler(
        IUserRepository userRepository,
        IBookingRepository bookingRepository,
        INotificationService notificationService,
        IPushNotificationService pushNotificationService,
        IApplicationDbContext context,
        IMediator mediator)
    {
        _userRepository = userRepository;
        _bookingRepository = bookingRepository;
        _notificationService = notificationService;
        _pushNotificationService = pushNotificationService;
        _context = context;
        _mediator = mediator;
    }

    public async Task<BookingResponse> Handle(
        CreateBookingCommand request,
        CancellationToken cancellationToken)
    {
        // 1. Verify customer exists
        var customer = await _userRepository.GetByIdAsync(request.CustomerId);
        if (customer == null)
            throw new NotFoundException("User", request.CustomerId);

        // 2. Reuse the pricing engine via MediatR
        var estimateQuery = new EstimateBookingQuery
        {
            PickupLatitude = request.PickupLatitude,
            PickupLongitude = request.PickupLongitude,
            PickupAddress = request.PickupAddress,
            Stops = request.Stops,
            CargoType = request.CargoType,
            RequiredVehicleSize = request.RequiredVehicleSize,
            NeedsHelpers = request.NeedsHelpers,
            HelperCount = request.HelperCount,
            NeedsLoading = request.NeedsLoading,
            NeedsUnloading = request.NeedsUnloading,
            IsExpress = request.IsExpress,
            IsFullDay = request.IsFullDay
        };

        var estimate = await _mediator.Send(estimateQuery, cancellationToken);

        // 3. Build the Booking entity
        const decimal commissionRate = 0.15m;
        var commission = Math.Round(estimate.TotalFare * commissionRate, 2);
        var driverPayout = Math.Round(estimate.TotalFare - commission, 2);

        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            CustomerId = request.CustomerId,
            DriverId = null,
            PickupAddress = request.PickupAddress,
            PickupLatitude = request.PickupLatitude,
            PickupLongitude = request.PickupLongitude,
            PickupContactName = request.PickupContactName,
            PickupContactPhone = request.PickupContactPhone,
            CargoType = request.CargoType,
            CargoDescription = request.CargoDescription,
            CargoWeightKg = request.CargoWeightKg,
            RequiredVehicleSize = request.RequiredVehicleSize,
            NeedsHelpers = request.NeedsHelpers,
            HelperCount = request.HelperCount,
            NeedsLoading = request.NeedsLoading,
            NeedsUnloading = request.NeedsUnloading,
            IsExpress = request.IsExpress,
            IsFullDay = request.IsFullDay,
            BaseFare = estimate.BaseFare,
            DistanceFare = estimate.DistanceFare,
            StopFare = estimate.StopFare,
            AddOnFare = estimate.AddOnFare,
            SurgeMultiplier = estimate.SurgeMultiplier,
            TotalFare = estimate.TotalFare,
            CommissionRate = commissionRate,
            Commission = commission,
            DriverPayout = driverPayout,
            TotalDistanceKm = estimate.TotalDistanceKm,
            EstimatedDurationMinutes = estimate.EstimatedDurationMinutes,
            ScheduledAt = request.ScheduledAt,
            PaymentMethod = request.PaymentMethod,
            Status = BookingStatus.Pending,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // 4. Create DeliveryStop entities
        booking.DeliveryStops = request.Stops
            .Select((stopDto, index) => new DeliveryStop
            {
                Id = Guid.NewGuid(),
                BookingId = booking.Id,
                Sequence = index + 1,
                Address = stopDto.Address,
                Latitude = stopDto.Latitude,
                Longitude = stopDto.Longitude,
                RecipientName = stopDto.RecipientName,
                RecipientPhone = stopDto.RecipientPhone,
                Notes = stopDto.Notes,
                Status = DeliveryStopStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            })
            .ToList();

        // 5. Persist booking
        await _bookingRepository.AddAsync(booking);
        await _context.SaveChangesAsync(cancellationToken);

        // 6. Transition to Searching state (driver matching begins)
        booking.Status = BookingStatus.Searching;
        booking.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        // Broadcast to drivers via SignalR
        await _notificationService.BroadcastNewJobAvailableAsync(
            booking.Id.ToString(),
            booking.RequiredVehicleSize.ToString(),
            booking.PickupAddress,
            booking.TotalFare,
            cancellationToken);

        // Push Notification to all Online Drivers
        try
        {
            var driverTokens = await _context.Drivers
                .Where(d => d.IsOnline && !string.IsNullOrEmpty(d.FcmToken))
                .Select(d => d.FcmToken!)
                .ToListAsync(cancellationToken);

            if (driverTokens.Any())
            {
                await _pushNotificationService.SendBulkPushNotificationAsync(
                    driverTokens,
                    "🚚 New Job Available!",
                    $"New pickup at {booking.PickupAddress} — Est. Fare LKR {booking.TotalFare:N0}",
                    new { bookingId = booking.Id.ToString() },
                    cancellationToken);
            }
        }
        catch (Exception ex)
        {
            // Log & continue without breaking booking creation
        }

        // 7. Map and return
        return MapToBookingResponse(booking);
    }

    private static BookingResponse MapToBookingResponse(Booking booking)
    {
        var stopResponses = booking.DeliveryStops?
            .OrderBy(s => s.Sequence)
            .Select(MapToDeliveryStopResponse)
            .ToList() ?? new List<DeliveryStopResponse>();

        return new BookingResponse(
            Id: booking.Id,
            CustomerId: booking.CustomerId,
            DriverId: booking.DriverId,
            PickupAddress: booking.PickupAddress,
            PickupLatitude: booking.PickupLatitude,
            PickupLongitude: booking.PickupLongitude,
            PickupContactName: booking.PickupContactName,
            PickupContactPhone: booking.PickupContactPhone,
            CargoType: booking.CargoType,
            CargoDescription: booking.CargoDescription,
            CargoWeightKg: booking.CargoWeightKg,
            RequiredVehicleSize: booking.RequiredVehicleSize,
            NeedsHelpers: booking.NeedsHelpers,
            HelperCount: booking.HelperCount,
            NeedsLoading: booking.NeedsLoading,
            NeedsUnloading: booking.NeedsUnloading,
            IsExpress: booking.IsExpress,
            IsFullDay: booking.IsFullDay,
            BaseFare: booking.BaseFare,
            DistanceFare: booking.DistanceFare,
            StopFare: booking.StopFare,
            AddOnFare: booking.AddOnFare,
            SurgeMultiplier: booking.SurgeMultiplier,
            TotalFare: booking.TotalFare,
            Commission: booking.Commission,
            DriverPayout: booking.DriverPayout,
            TotalDistanceKm: booking.TotalDistanceKm,
            EstimatedDurationMinutes: booking.EstimatedDurationMinutes,
            ScheduledAt: booking.ScheduledAt,
            StartedAt: booking.StartedAt,
            CompletedAt: booking.CompletedAt,
            Status: booking.Status.ToString(),
            CancellationReason: booking.CancellationReason,
            DeliveryStops: stopResponses,
            Payment: null,
            Review: null
        );
    }

    private static DeliveryStopResponse MapToDeliveryStopResponse(DeliveryStop stop) =>
        new(
            Id: stop.Id,
            Sequence: stop.Sequence,
            Address: stop.Address,
            Latitude: stop.Latitude,
            Longitude: stop.Longitude,
            RecipientName: stop.RecipientName,
            RecipientPhone: stop.RecipientPhone,
            Notes: stop.Notes,
            Status: stop.Status.ToString(),
            ArrivedAt: stop.ArrivedAt,
            CompletedAt: stop.CompletedAt
        );
}
