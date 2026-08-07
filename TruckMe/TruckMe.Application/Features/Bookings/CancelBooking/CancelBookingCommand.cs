// Features/Bookings/CancelBooking/CancelBookingCommand.cs
using MediatR;
using TruckMe.Application.Common.Models;

namespace TruckMe.Application.Features.Bookings.CancelBooking;

public record CancelBookingCommand : IRequest<Result>
{
    public Guid BookingId { get; init; }
    public string? CancellationReason { get; init; }
}
