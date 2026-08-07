// Features/Drivers/GetAvailableJobs/GetAvailableJobsQueryHandler.cs
using MediatR;
using TruckMe.Application.Common.Exceptions;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.DTOs;
using TruckMe.Domain.Enums;
using TruckMe.Domain.Interfaces;

namespace TruckMe.Application.Features.Drivers.GetAvailableJobs;

public sealed class GetAvailableJobsQueryHandler
    : IRequestHandler<GetAvailableJobsQuery, List<AvailableJobDto>>
{
    private readonly IDriverRepository _driverRepository;
    private readonly IBookingRepository _bookingRepository;
    private readonly IGeoService _geoService;

    public GetAvailableJobsQueryHandler(
        IDriverRepository driverRepository,
        IBookingRepository bookingRepository,
        IGeoService geoService)
    {
        _driverRepository = driverRepository;
        _bookingRepository = bookingRepository;
        _geoService = geoService;
    }

    public async Task<List<AvailableJobDto>> Handle(
        GetAvailableJobsQuery request,
        CancellationToken cancellationToken)
    {
        var driver = await _driverRepository.GetByIdAsync(request.DriverId);

        if (driver == null)
            throw new NotFoundException("Driver", request.DriverId);

        // TODO: In production this filter should be pushed down to the database
        // via a dedicated IBookingRepository.GetSearchingByVehicleSizeAsync(vehicleSize) method
        // to avoid loading all bookings into memory.
        var allBookings = await _bookingRepository.GetAllAsync();

        var searchingBookings = allBookings
            .Where(b => b.Status == BookingStatus.Searching &&
                        b.RequiredVehicleSize == driver.VehicleType)
            .ToList();

        // Calculate distance from driver to each booking's pickup location
        var jobsWithDistance = new List<(AvailableJobDto Job, decimal Distance)>();

        foreach (var booking in searchingBookings)
        {
            var distanceKm = await _geoService.GetDistanceKmAsync(
                driver.CurrentLatitude, driver.CurrentLongitude,
                booking.PickupLatitude, booking.PickupLongitude);

            var job = new AvailableJobDto(
                BookingId: booking.Id,
                PickupAddress: booking.PickupAddress,
                PickupLatitude: booking.PickupLatitude,
                PickupLongitude: booking.PickupLongitude,
                DistanceFromDriverKm: Math.Round(distanceKm, 2),
                TotalFare: booking.TotalFare,
                RequiredVehicleSize: booking.RequiredVehicleSize,
                CargoType: booking.CargoType,
                StopCount: booking.DeliveryStops?.Count ?? 0,
                ScheduledAt: booking.ScheduledAt
            );

            jobsWithDistance.Add((job, distanceKm));
        }

        // Sort by nearest first, return top 10
        return jobsWithDistance
            .OrderBy(x => x.Distance)
            .Take(10)
            .Select(x => x.Job)
            .ToList();
    }
}
