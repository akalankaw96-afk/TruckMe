// Features/Bookings/GetCustomerBookings/GetCustomerBookingsQueryHandler.cs
using MediatR;
using TruckMe.Application.Common.Exceptions;
using TruckMe.Application.DTOs;
using TruckMe.Domain.Interfaces;

namespace TruckMe.Application.Features.Bookings.GetCustomerBookings;

public sealed class GetCustomerBookingsQueryHandler
    : IRequestHandler<GetCustomerBookingsQuery, List<BookingListDto>>
{
    private readonly IBookingRepository _bookingRepository;
    private readonly IDriverRepository _driverRepository;

    public GetCustomerBookingsQueryHandler(
        IBookingRepository bookingRepository,
        IDriverRepository driverRepository)
    {
        _bookingRepository = bookingRepository;
        _driverRepository = driverRepository;
    }

    public async Task<List<BookingListDto>> Handle(
        GetCustomerBookingsQuery request,
        CancellationToken cancellationToken)
    {
        var bookings = await _bookingRepository.GetByCustomerIdAsync(request.CustomerId);

        var result = new List<BookingListDto>();

        foreach (var booking in bookings)
        {
            string? driverName = null;

            if (booking.DriverId.HasValue)
            {
                // Prefer navigation property if already loaded
                if (booking.Driver?.User != null)
                {
                    driverName = booking.Driver.User.FullName;
                }
                else
                {
                    // Fall back to repository lookup
                    var driver = await _driverRepository.GetByIdAsync(booking.DriverId.Value);
                    driverName = driver?.User?.FullName;
                }
            }

            result.Add(new BookingListDto(
                Id: booking.Id,
                PickupAddress: booking.PickupAddress,
                Status: booking.Status.ToString(),
                TotalFare: booking.TotalFare,
                ScheduledAt: booking.ScheduledAt,
                CompletedAt: booking.CompletedAt,
                DriverName: driverName,
                StopCount: booking.DeliveryStops?.Count ?? 0
            ));
        }

        return result;
    }
}
