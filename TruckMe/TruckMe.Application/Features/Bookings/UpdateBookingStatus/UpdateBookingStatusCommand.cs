// Features/Bookings/UpdateBookingStatus/UpdateBookingStatusCommand.cs
using MediatR;
using TruckMe.Application.Common.Models;
using TruckMe.Domain.Enums;

namespace TruckMe.Application.Features.Bookings.UpdateBookingStatus;

public record UpdateBookingStatusCommand : IRequest<Result>
{
    public Guid BookingId { get; init; }
    public BookingStatus NewStatus { get; init; }
}
