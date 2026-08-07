// Features/Estimates/EstimateBooking/EstimateBookingQueryValidator.cs
using FluentValidation;
using TruckMe.Application.DTOs;

namespace TruckMe.Application.Features.Estimates.EstimateBooking;

public sealed class EstimateBookingQueryValidator : AbstractValidator<EstimateBookingQuery>
{
    public EstimateBookingQueryValidator()
    {
        RuleFor(x => x.PickupAddress)
            .NotEmpty().WithMessage("Pickup address is required.");

        RuleFor(x => x.Stops)
            .NotEmpty().WithMessage("At least one delivery stop is required.");

        RuleForEach(x => x.Stops)
            .ChildRules(stop =>
            {
                stop.RuleFor(s => s.Address)
                    .NotEmpty().WithMessage("Stop address is required.");
                stop.RuleFor(s => s.RecipientName)
                    .NotEmpty().WithMessage("Recipient name is required for each stop.");
                stop.RuleFor(s => s.RecipientPhone)
                    .NotEmpty().WithMessage("Recipient phone is required for each stop.");
            });

        RuleFor(x => x.HelperCount)
            .GreaterThanOrEqualTo(0).WithMessage("Helper count must be zero or greater.");

        When(x => x.NeedsHelpers, () =>
        {
            RuleFor(x => x.HelperCount)
                .GreaterThanOrEqualTo(1)
                .WithMessage("At least 1 helper must be specified when helpers are requested.");
        });
    }
}
