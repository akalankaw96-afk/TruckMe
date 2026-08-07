// Features/Reviews/SubmitReview/SubmitReviewCommand.cs
using MediatR;
using TruckMe.Application.DTOs;

namespace TruckMe.Application.Features.Reviews.SubmitReview;

public record SubmitReviewCommand : IRequest<ReviewResponse>
{
    public Guid BookingId { get; init; }
    public Guid CustomerId { get; init; }
    public int Rating { get; init; }
    public string? Comment { get; init; }
    public int PunctualityRating { get; init; }
    public int ProfessionalismRating { get; init; }
    public int VehicleConditionRating { get; init; }
    public int ServiceRating { get; init; }
}
