using MediatR;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Exceptions;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.Common.Models;
using TruckMe.Domain.Enums;
using TruckMe.Domain.Interfaces;

namespace TruckMe.Application.Features.Drivers.AcceptJob;

public sealed class AcceptJobCommandHandler : IRequestHandler<AcceptJobCommand, Result>
{
    private readonly IBookingRepository _bookingRepository;
    private readonly IDriverRepository _driverRepository;
    private readonly INotificationService _notificationService;
    private readonly IPushNotificationService _pushNotificationService;
    private readonly IApplicationDbContext _context;

    public AcceptJobCommandHandler(
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
        AcceptJobCommand request,
        CancellationToken cancellationToken)
    {
        var booking = await _bookingRepository.GetWithDetailsAsync(request.BookingId);

        if (booking == null)
            throw new NotFoundException("Booking", request.BookingId);

        if (booking.Status != BookingStatus.Searching)
            return Result.Failure("This job is no longer available.");

        var driver = await _driverRepository.GetByIdAsync(request.DriverId);

        if (driver == null)
            throw new NotFoundException("Driver", request.DriverId);

        if (!driver.IsOnline)
            return Result.Failure("You must be online to accept jobs.");

        // Assign driver to booking
        booking.DriverId = request.DriverId;
        booking.Status = BookingStatus.Assigned;
        booking.StartedAt = DateTime.UtcNow;
        booking.UpdatedAt = DateTime.UtcNow;

        // Update driver status
        driver.Status = DriverStatus.OnJob;
        driver.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        // Send SignalR notification to customer that driver is assigned
        await _notificationService.NotifyDriverJobAcceptedAsync(
            booking.Id.ToString(),
            driver.Id.ToString(),
            booking.CustomerId.ToString(),
            cancellationToken);

        // Send Push Notification to Customer
        try
        {
            var customer = await _context.Users.FirstOrDefaultAsync(u => u.Id == booking.CustomerId, cancellationToken);
            if (customer != null && !string.IsNullOrEmpty(customer.FcmToken))
            {
                await _pushNotificationService.SendPushNotificationAsync(
                    customer.FcmToken,
                    "✅ Driver Assigned!",
                    $"A driver has accepted your booking #{booking.Id.ToString()[..8].ToUpper()}.",
                    new { bookingId = booking.Id.ToString() },
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
