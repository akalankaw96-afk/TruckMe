// Features/Bookings/GetBookingById/GetBookingByIdQuery.cs
using MediatR;
using TruckMe.Application.DTOs;

namespace TruckMe.Application.Features.Bookings.GetBookingById;

public record GetBookingByIdQuery : IRequest<BookingResponse>
{
    public Guid Id { get; init; }
}
