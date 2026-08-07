// Features/Drivers/AcceptJob/AcceptJobCommandValidator.cs
using FluentValidation;

namespace TruckMe.Application.Features.Drivers.AcceptJob;

public sealed class AcceptJobCommandValidator : AbstractValidator<AcceptJobCommand>
{
    public AcceptJobCommandValidator()
    {
        RuleFor(x => x.DriverId)
            .NotEmpty().WithMessage("Driver ID is required.");

        RuleFor(x => x.BookingId)
            .NotEmpty().WithMessage("Booking ID is required.");
    }
}
