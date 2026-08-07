// Features/Reviews/SubmitReview/SubmitReviewCommandValidator.cs
using FluentValidation;

namespace TruckMe.Application.Features.Reviews.SubmitReview;

public sealed class SubmitReviewCommandValidator : AbstractValidator<SubmitReviewCommand>
{
    public SubmitReviewCommandValidator()
    {
        RuleFor(x => x.BookingId)
            .NotEmpty().WithMessage("Booking ID is required.");

        RuleFor(x => x.CustomerId)
            .NotEmpty().WithMessage("Customer ID is required.");

        RuleFor(x => x.Rating)
            .InclusiveBetween(1, 5).WithMessage("Rating must be between 1 and 5.");

        RuleFor(x => x.PunctualityRating)
            .InclusiveBetween(1, 5).WithMessage("Punctuality rating must be between 1 and 5.");

        RuleFor(x => x.ProfessionalismRating)
            .InclusiveBetween(1, 5).WithMessage("Professionalism rating must be between 1 and 5.");

        RuleFor(x => x.VehicleConditionRating)
            .InclusiveBetween(1, 5).WithMessage("Vehicle condition rating must be between 1 and 5.");

        RuleFor(x => x.ServiceRating)
            .InclusiveBetween(1, 5).WithMessage("Service rating must be between 1 and 5.");
    }
}
