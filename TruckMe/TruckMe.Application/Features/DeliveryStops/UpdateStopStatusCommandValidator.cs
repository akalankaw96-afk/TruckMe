// Features/DeliveryStops/UpdateStopStatusCommandValidator.cs
using FluentValidation;

namespace TruckMe.Application.Features.DeliveryStops;

public sealed class UpdateStopStatusCommandValidator : AbstractValidator<UpdateStopStatusCommand>
{
    public UpdateStopStatusCommandValidator()
    {
        RuleFor(x => x.BookingId)
            .NotEmpty().WithMessage("Booking ID is required.");

        RuleFor(x => x.StopSequence)
            .GreaterThanOrEqualTo(1).WithMessage("Stop sequence must be at least 1.");
    }
}
