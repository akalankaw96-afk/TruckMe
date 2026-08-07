// Features/Reviews/SubmitReview/SubmitReviewCommandHandler.cs
using MediatR;
using TruckMe.Application.Common.Exceptions;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.DTOs;
using TruckMe.Domain.Entities;
using TruckMe.Domain.Enums;
using TruckMe.Domain.Interfaces;

namespace TruckMe.Application.Features.Reviews.SubmitReview;

public sealed class SubmitReviewCommandHandler : IRequestHandler<SubmitReviewCommand, ReviewResponse>
{
    private readonly IBookingRepository _bookingRepository;
    private readonly IDriverRepository _driverRepository;
    private readonly IApplicationDbContext _context;

    public SubmitReviewCommandHandler(
        IBookingRepository bookingRepository,
        IDriverRepository driverRepository,
        IApplicationDbContext context)
    {
        _bookingRepository = bookingRepository;
        _driverRepository = driverRepository;
        _context = context;
    }

    public async Task<ReviewResponse> Handle(
        SubmitReviewCommand request,
        CancellationToken cancellationToken)
    {
        var booking = await _bookingRepository.GetWithDetailsAsync(request.BookingId);

        if (booking == null)
            throw new NotFoundException("Booking", request.BookingId);

        // Authorization: only the customer who made the booking can review it
        if (booking.CustomerId != request.CustomerId)
            throw new UnauthorizedAccessException("You can only review your own bookings.");

        // Guard: no duplicate reviews
        if (booking.Review != null)
        {
            throw new ValidationException(
                "This booking has already been reviewed.");
        }

        // Guard: only completed bookings can be reviewed
        if (booking.Status != BookingStatus.Completed &&
            booking.Status != BookingStatus.Delivered)
        {
            throw new ValidationException(
                "Can only review completed bookings.");
        }

        if (!booking.DriverId.HasValue)
        {
            throw new ValidationException(
                "Cannot submit a review for a booking with no assigned driver.");
        }

        // Create the review
        var review = new Review
        {
            Id = Guid.NewGuid(),
            BookingId = request.BookingId,
            CustomerId = request.CustomerId,
            DriverId = booking.DriverId.Value,
            Rating = request.Rating,
            Comment = request.Comment,
            PunctualityRating = request.PunctualityRating,
            ProfessionalismRating = request.ProfessionalismRating,
            VehicleConditionRating = request.VehicleConditionRating,
            ServiceRating = request.ServiceRating,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.Reviews.AddAsync(review, cancellationToken);

        // Update driver's rating average using Welford's running average
        var driver = await _driverRepository.GetByIdAsync(booking.DriverId.Value);
        if (driver != null)
        {
            var oldTotal = driver.TotalRatings;
            var oldAverage = driver.RatingAverage;

            driver.TotalRatings = oldTotal + 1;
            driver.RatingAverage = Math.Round(
                (oldAverage * oldTotal + request.Rating) / driver.TotalRatings,
                2);
            driver.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Resolve display names from navigation properties or driver entity
        var customerName = booking.Customer?.FullName ?? string.Empty;
        var driverName = booking.Driver?.User?.FullName
                         ?? driver?.User?.FullName
                         ?? string.Empty;

        return new ReviewResponse(
            Id: review.Id,
            BookingId: review.BookingId,
            CustomerId: review.CustomerId,
            CustomerName: customerName,
            DriverId: review.DriverId,
            DriverName: driverName,
            Rating: review.Rating,
            Comment: review.Comment,
            PunctualityRating: review.PunctualityRating,
            ProfessionalismRating: review.ProfessionalismRating,
            VehicleConditionRating: review.VehicleConditionRating,
            ServiceRating: review.ServiceRating,
            CreatedAt: review.CreatedAt
        );
    }
}
