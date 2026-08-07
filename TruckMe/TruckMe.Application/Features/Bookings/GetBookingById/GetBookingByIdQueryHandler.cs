// Features/Bookings/GetBookingById/GetBookingByIdQueryHandler.cs
using MediatR;
using TruckMe.Application.Common.Exceptions;
using TruckMe.Application.DTOs;
using TruckMe.Domain.Entities;
using TruckMe.Domain.Interfaces;

namespace TruckMe.Application.Features.Bookings.GetBookingById;

public sealed class GetBookingByIdQueryHandler : IRequestHandler<GetBookingByIdQuery, BookingResponse>
{
    private readonly IBookingRepository _bookingRepository;

    public GetBookingByIdQueryHandler(IBookingRepository bookingRepository)
    {
        _bookingRepository = bookingRepository;
    }

    public async Task<BookingResponse> Handle(
        GetBookingByIdQuery request,
        CancellationToken cancellationToken)
    {
        var booking = await _bookingRepository.GetWithDetailsAsync(request.Id);

        if (booking == null)
            throw new NotFoundException("Booking", request.Id);

        return MapToBookingResponse(booking);
    }

    internal static BookingResponse MapToBookingResponse(Booking booking)
    {
        var stopResponses = booking.DeliveryStops?
            .OrderBy(s => s.Sequence)
            .Select(MapToDeliveryStopResponse)
            .ToList() ?? new List<DeliveryStopResponse>();

        PaymentResponse? paymentResponse = null;
        if (booking.Payment != null)
        {
            paymentResponse = new PaymentResponse(
                Id: booking.Payment.Id,
                BookingId: booking.Payment.BookingId,
                Amount: booking.Payment.Amount,
                Method: booking.Payment.Method.ToString(),
                Status: booking.Payment.Status.ToString(),
                TransactionId: booking.Payment.TransactionId,
                CommissionAmount: booking.Payment.CommissionAmount,
                DriverPayoutAmount: booking.Payment.DriverPayoutAmount,
                PaidAt: booking.Payment.PaidAt,
                InvoiceUrl: booking.Payment.InvoiceUrl
            );
        }

        ReviewResponse? reviewResponse = null;
        if (booking.Review != null)
        {
            reviewResponse = new ReviewResponse(
                Id: booking.Review.Id,
                BookingId: booking.Review.BookingId,
                CustomerId: booking.Review.CustomerId,
                CustomerName: booking.Customer?.FullName ?? string.Empty,
                DriverId: booking.Review.DriverId,
                DriverName: booking.Driver?.User?.FullName ?? string.Empty,
                Rating: booking.Review.Rating,
                Comment: booking.Review.Comment,
                PunctualityRating: booking.Review.PunctualityRating,
                ProfessionalismRating: booking.Review.ProfessionalismRating,
                VehicleConditionRating: booking.Review.VehicleConditionRating,
                ServiceRating: booking.Review.ServiceRating,
                CreatedAt: booking.Review.CreatedAt
            );
        }

        return new BookingResponse(
            Id: booking.Id,
            CustomerId: booking.CustomerId,
            DriverId: booking.DriverId,
            PickupAddress: booking.PickupAddress,
            PickupLatitude: booking.PickupLatitude,
            PickupLongitude: booking.PickupLongitude,
            PickupContactName: booking.PickupContactName,
            PickupContactPhone: booking.PickupContactPhone,
            CargoType: booking.CargoType,
            CargoDescription: booking.CargoDescription,
            CargoWeightKg: booking.CargoWeightKg,
            RequiredVehicleSize: booking.RequiredVehicleSize,
            NeedsHelpers: booking.NeedsHelpers,
            HelperCount: booking.HelperCount,
            NeedsLoading: booking.NeedsLoading,
            NeedsUnloading: booking.NeedsUnloading,
            IsExpress: booking.IsExpress,
            IsFullDay: booking.IsFullDay,
            BaseFare: booking.BaseFare,
            DistanceFare: booking.DistanceFare,
            StopFare: booking.StopFare,
            AddOnFare: booking.AddOnFare,
            SurgeMultiplier: booking.SurgeMultiplier,
            TotalFare: booking.TotalFare,
            Commission: booking.Commission,
            DriverPayout: booking.DriverPayout,
            TotalDistanceKm: booking.TotalDistanceKm,
            EstimatedDurationMinutes: booking.EstimatedDurationMinutes,
            ScheduledAt: booking.ScheduledAt,
            StartedAt: booking.StartedAt,
            CompletedAt: booking.CompletedAt,
            Status: booking.Status.ToString(),
            CancellationReason: booking.CancellationReason,
            DeliveryStops: stopResponses,
            Payment: paymentResponse,
            Review: reviewResponse
        );
    }

    private static DeliveryStopResponse MapToDeliveryStopResponse(DeliveryStop stop) =>
        new(
            Id: stop.Id,
            Sequence: stop.Sequence,
            Address: stop.Address,
            Latitude: stop.Latitude,
            Longitude: stop.Longitude,
            RecipientName: stop.RecipientName,
            RecipientPhone: stop.RecipientPhone,
            Notes: stop.Notes,
            Status: stop.Status.ToString(),
            ArrivedAt: stop.ArrivedAt,
            CompletedAt: stop.CompletedAt
        );
}
