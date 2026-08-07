// Features/Bookings/CancelBooking/CancelBookingCommandValidator.cs
using FluentValidation;

namespace TruckMe.Application.Features.Bookings.CancelBooking;

public sealed class CancelBookingCommandValidator : AbstractValidator<CancelBookingCommand>
{
    public CancelBookingCommandValidator()
    {
        RuleFor(x => x.BookingId)
            .NotEmpty().WithMessage("Booking ID is required.");
    }
}
