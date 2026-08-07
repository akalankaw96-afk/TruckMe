// Features/Bookings/GetCustomerBookings/GetCustomerBookingsQuery.cs
using MediatR;
using TruckMe.Application.DTOs;

namespace TruckMe.Application.Features.Bookings.GetCustomerBookings;

public record GetCustomerBookingsQuery : IRequest<List<BookingListDto>>
{
    public Guid CustomerId { get; init; }
}
