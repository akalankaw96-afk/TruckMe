using MediatR;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Exceptions;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.Common.Models;
using TruckMe.Domain.Enums;
using TruckMe.Domain.Interfaces;

namespace TruckMe.Application.Features.DeliveryStops;

public sealed class UpdateStopStatusCommandHandler : IRequestHandler<UpdateStopStatusCommand, Result>
{
    private readonly IBookingRepository _bookingRepository;
    private readonly INotificationService _notificationService;
    private readonly IPushNotificationService _pushNotificationService;
    private readonly IApplicationDbContext _context;

    public UpdateStopStatusCommandHandler(
        IBookingRepository bookingRepository,
        INotificationService notificationService,
        IPushNotificationService pushNotificationService,
        IApplicationDbContext context)
    {
        _bookingRepository = bookingRepository;
        _notificationService = notificationService;
        _pushNotificationService = pushNotificationService;
        _context = context;
    }

    public async Task<Result> Handle(
        UpdateStopStatusCommand request,
        CancellationToken cancellationToken)
    {
        var booking = await _bookingRepository.GetWithDetailsAsync(request.BookingId);

        if (booking == null)
            throw new NotFoundException("Booking", request.BookingId);

        var stop = booking.DeliveryStops?
            .FirstOrDefault(s => s.Sequence == request.StopSequence);

        if (stop == null)
            return Result.Failure($"Stop {request.StopSequence} not found in booking {request.BookingId}.");

        // Update the individual stop
        stop.Status = request.NewStatus;
        stop.UpdatedAt = DateTime.UtcNow;

        if (request.NewStatus == DeliveryStopStatus.Arrived)
            stop.ArrivedAt = DateTime.UtcNow;

        if (request.NewStatus == DeliveryStopStatus.Completed)
            stop.CompletedAt = DateTime.UtcNow;

        // Update overall booking status based on stop progression
        if (booking.DeliveryStops != null)
        {
            bool allStopsCompleted = booking.DeliveryStops.All(s => s.Status == DeliveryStopStatus.Completed);

            if (allStopsCompleted)
            {
                // All stops delivered — the booking is complete
                booking.Status = BookingStatus.Delivered;
                booking.CompletedAt = DateTime.UtcNow;
            }
            else if (request.NewStatus == DeliveryStopStatus.Arrived)
            {
                // Driver arrived at at least one stop
                booking.Status = BookingStatus.AtDeliveryStop;
            }
        }

        booking.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        // Send SignalR notification to customer about stop status change
        await _notificationService.NotifyStopStatusUpdatedAsync(
            booking.Id.ToString(),
            stop.Id,
            request.NewStatus.ToString(),
            cancellationToken);

        // Send Push Notification to Customer
        try
        {
            var customer = await _context.Users.FirstOrDefaultAsync(u => u.Id == booking.CustomerId, cancellationToken);
            if (customer != null && !string.IsNullOrEmpty(customer.FcmToken))
            {
                string title = request.NewStatus == DeliveryStopStatus.Completed
                    ? "📦 Delivery Stop Completed!"
                    : "📍 Driver Arrived at Stop!";

                await _pushNotificationService.SendPushNotificationAsync(
                    customer.FcmToken,
                    title,
                    $"Stop #{stop.Sequence} ({stop.Address}) is now {request.NewStatus}.",
                    new { bookingId = booking.Id.ToString(), stopSequence = stop.Sequence },
                    cancellationToken);
            }
        }
        catch (Exception)
        {
            // Log & continue
        }

        return Result.Success();
    }
}
