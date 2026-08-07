using MediatR;
using TruckMe.Application.DTOs;
using TruckMe.Domain.Enums;
using TruckMe.Domain.Interfaces;

namespace TruckMe.Application.Features.Drivers.GetDriverEarnings;

public class GetDriverEarningsQueryHandler : IRequestHandler<GetDriverEarningsQuery, DriverEarningsDto>
{
    private readonly IDriverRepository _driverRepository;
    private readonly IBookingRepository _bookingRepository;

    public GetDriverEarningsQueryHandler(
        IDriverRepository driverRepository,
        IBookingRepository bookingRepository)
    {
        _driverRepository = driverRepository;
        _bookingRepository = bookingRepository;
    }

    public async Task<DriverEarningsDto> Handle(GetDriverEarningsQuery request, CancellationToken cancellationToken)
    {
        var driver = await _driverRepository.GetByIdAsync(request.DriverId);
        if (driver is null)
        {
            return new DriverEarningsDto(0m, 0m, 0m, 0, 0, 0m);
        }

        var driverBookings = await _bookingRepository.GetByDriverIdAsync(request.DriverId);
        var completedBookings = driverBookings
            .Where(b => b.Status == BookingStatus.Completed)
            .ToList();

        var today = DateTime.UtcNow.Date;
        var startOfWeek = today.AddDays(-(int)today.DayOfWeek);

        var todayEarnings = completedBookings
            .Where(b => b.CompletedAt.HasValue && b.CompletedAt.Value.Date == today)
            .Sum(b => b.DriverPayout);

        var weekEarnings = completedBookings
            .Where(b => b.CompletedAt.HasValue && b.CompletedAt.Value.Date >= startOfWeek)
            .Sum(b => b.DriverPayout);

        var completedJobsToday = completedBookings
            .Count(b => b.CompletedAt.HasValue && b.CompletedAt.Value.Date == today);

        var completedJobsThisWeek = completedBookings
            .Count(b => b.CompletedAt.HasValue && b.CompletedAt.Value.Date >= startOfWeek);

        return new DriverEarningsDto(
            TodayEarnings: todayEarnings,
            WeekEarnings: weekEarnings,
            TotalEarnings: driver.TotalEarnings,
            CompletedJobsToday: completedJobsToday,
            CompletedJobsThisWeek: completedJobsThisWeek,
            AverageRating: driver.RatingAverage
        );
    }
}
