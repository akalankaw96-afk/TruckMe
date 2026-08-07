// Features/Bookings/UpdateBookingStatus/UpdateBookingStatusCommandHandler.cs
using MediatR;
using TruckMe.Application.Common.Exceptions;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.Common.Models;
using TruckMe.Domain.Enums;
using TruckMe.Domain.Interfaces;

namespace TruckMe.Application.Features.Bookings.UpdateBookingStatus;

public sealed class UpdateBookingStatusCommandHandler
    : IRequestHandler<UpdateBookingStatusCommand, Result>
{
    private readonly IBookingRepository _bookingRepository;
    private readonly IApplicationDbContext _context;

    public UpdateBookingStatusCommandHandler(
        IBookingRepository bookingRepository,
        IApplicationDbContext context)
    {
        _bookingRepository = bookingRepository;
        _context = context;
    }

    public async Task<Result> Handle(
        UpdateBookingStatusCommand request,
        CancellationToken cancellationToken)
    {
        var booking = await _bookingRepository.GetWithDetailsAsync(request.BookingId);

        if (booking == null)
            throw new NotFoundException("Booking", request.BookingId);

        booking.Status = request.NewStatus;
        booking.UpdatedAt = DateTime.UtcNow;

        if (request.NewStatus == BookingStatus.Completed)
            booking.CompletedAt = DateTime.UtcNow;

        // Only set StartedAt if it hasn't been set yet (e.g. driver moves to InTransit)
        if (request.NewStatus == BookingStatus.InTransit && booking.StartedAt == null)
            booking.StartedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
