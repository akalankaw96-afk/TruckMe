using MediatR;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Exceptions;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.Common.Models;
using TruckMe.Domain.Enums;
using TruckMe.Domain.Interfaces;

namespace TruckMe.Application.Features.Bookings.CancelBooking;

public sealed class CancelBookingCommandHandler : IRequestHandler<CancelBookingCommand, Result>
{
    private readonly IBookingRepository _bookingRepository;
    private readonly IDriverRepository _driverRepository;
    private readonly INotificationService _notificationService;
    private readonly IPushNotificationService _pushNotificationService;
    private readonly IApplicationDbContext _context;

    public CancelBookingCommandHandler(
        IBookingRepository bookingRepository,
        IDriverRepository driverRepository,
        INotificationService notificationService,
        IPushNotificationService pushNotificationService,
        IApplicationDbContext context)
    {
        _bookingRepository = bookingRepository;
        _driverRepository = driverRepository;
        _notificationService = notificationService;
        _pushNotificationService = pushNotificationService;
        _context = context;
    }

    public async Task<Result> Handle(
        CancelBookingCommand request,
        CancellationToken cancellationToken)
    {
        var booking = await _bookingRepository.GetWithDetailsAsync(request.BookingId);

        if (booking == null)
            throw new NotFoundException("Booking", request.BookingId);

        // Bookings in terminal states cannot be cancelled
        if (booking.Status is BookingStatus.Completed
                           or BookingStatus.Delivered
                           or BookingStatus.Cancelled)
        {
            return Result.Failure(
                "Booking cannot be cancelled in its current state. " +
                $"Current status: {booking.Status}.");
        }

        booking.Status = BookingStatus.Cancelled;
        booking.CancellationReason = request.CancellationReason;
        booking.UpdatedAt = DateTime.UtcNow;

        // If a driver was assigned, free up their status & notify driver via Push
        if (booking.DriverId.HasValue)
        {
            var driver = await _driverRepository.GetByIdAsync(booking.DriverId.Value);
            if (driver != null)
            {
                if (driver.Status == DriverStatus.OnJob)
                {
                    driver.Status = driver.IsOnline ? DriverStatus.Online : DriverStatus.Offline;
                    driver.UpdatedAt = DateTime.UtcNow;
                }

                if (!string.IsNullOrEmpty(driver.FcmToken))
                {
                    try
                    {
                        await _pushNotificationService.SendPushNotificationAsync(
                            driver.FcmToken,
                            "🚫 Booking Cancelled",
                            $"Booking #{booking.Id.ToString()[..8].ToUpper()} was cancelled by customer.",
                            new { bookingId = booking.Id.ToString() },
                            cancellationToken);
                    }
                    catch (Exception) { }
                }
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Notify via SignalR
        await _notificationService.NotifyStopStatusUpdatedAsync(
            booking.Id.ToString(),
            Guid.Empty,
            "Cancelled",
            cancellationToken);

        return Result.Success();
    }
}
