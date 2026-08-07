// Features/Drivers/UpdateLocation/UpdateDriverLocationCommandHandler.cs
using MediatR;
using TruckMe.Application.Common.Exceptions;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.Common.Models;
using TruckMe.Domain.Interfaces;

namespace TruckMe.Application.Features.Drivers.UpdateLocation;

public sealed class UpdateDriverLocationCommandHandler
    : IRequestHandler<UpdateDriverLocationCommand, Result>
{
    private readonly IDriverRepository _driverRepository;
    private readonly IBookingRepository _bookingRepository;
    private readonly INotificationService _notificationService;
    private readonly IApplicationDbContext _context;

    public UpdateDriverLocationCommandHandler(
        IDriverRepository driverRepository,
        IBookingRepository bookingRepository,
        INotificationService notificationService,
        IApplicationDbContext context)
    {
        _driverRepository = driverRepository;
        _bookingRepository = bookingRepository;
        _notificationService = notificationService;
        _context = context;
    }

    public async Task<Result> Handle(
        UpdateDriverLocationCommand request,
        CancellationToken cancellationToken)
    {
        var driver = await _driverRepository.GetByIdAsync(request.DriverId);

        if (driver == null)
            throw new NotFoundException("Driver", request.DriverId);

        driver.CurrentLatitude = request.Latitude;
        driver.CurrentLongitude = request.Longitude;
        driver.LastLocationUpdate = DateTime.UtcNow;
        driver.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        // Push updated location to SignalR TrackingHub for active bookings
        var driverBookings = await _bookingRepository.GetByDriverIdAsync(driver.Id);
        var activeBookings = driverBookings.Where(b => 
            b.Status == Domain.Enums.BookingStatus.Assigned ||
            b.Status == Domain.Enums.BookingStatus.DriverEnRoute ||
            b.Status == Domain.Enums.BookingStatus.ArrivedAtPickup ||
            b.Status == Domain.Enums.BookingStatus.InTransit);

        foreach (var booking in activeBookings)
        {
            await _notificationService.PublishLocationUpdateAsync(
                booking.Id.ToString(), 
                request.Latitude, 
                request.Longitude, 
                cancellationToken);
        }

        return Result.Success();
    }
}
