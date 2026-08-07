// Features/Bookings/CreateBooking/CreateBookingCommandValidator.cs
using FluentValidation;

namespace TruckMe.Application.Features.Bookings.CreateBooking;

public sealed class CreateBookingCommandValidator : AbstractValidator<CreateBookingCommand>
{
    public CreateBookingCommandValidator()
    {
        RuleFor(x => x.CustomerId)
            .NotEmpty().WithMessage("Customer ID is required.");

        RuleFor(x => x.PickupAddress)
            .NotEmpty().WithMessage("Pickup address is required.");

        RuleFor(x => x.PickupContactName)
            .NotEmpty().WithMessage("Pickup contact name is required.");

        RuleFor(x => x.PickupContactPhone)
            .NotEmpty().WithMessage("Pickup contact phone is required.");

        RuleFor(x => x.Stops)
            .NotEmpty().WithMessage("At least one delivery stop is required.");

        RuleForEach(x => x.Stops)
            .ChildRules(stop =>
            {
                stop.RuleFor(s => s.Address)
                    .NotEmpty().WithMessage("Each delivery stop must have an address.");
                stop.RuleFor(s => s.RecipientName)
                    .NotEmpty().WithMessage("Each delivery stop must have a recipient name.");
                stop.RuleFor(s => s.RecipientPhone)
                    .NotEmpty().WithMessage("Each delivery stop must have a recipient phone number.");
            });

        RuleFor(x => x.ScheduledAt)
            .GreaterThan(DateTime.UtcNow)
            .WithMessage("Scheduled time must be in the future.");

        RuleFor(x => x.HelperCount)
            .GreaterThanOrEqualTo(0).WithMessage("Helper count cannot be negative.");

        When(x => x.NeedsHelpers, () =>
        {
            RuleFor(x => x.HelperCount)
                .GreaterThanOrEqualTo(1)
                .WithMessage("At least 1 helper must be specified when helpers are requested.");
        });
    }
}
