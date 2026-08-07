using MediatR;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.DTOs;
using TruckMe.Domain.Enums;

namespace TruckMe.Application.Features.Payments.GetInvoice;

public class GetInvoiceQuery : IRequest<InvoiceResponse?>
{
    public Guid BookingId { get; set; }
}

public class GetInvoiceQueryHandler : IRequestHandler<GetInvoiceQuery, InvoiceResponse?>
{
    private readonly IApplicationDbContext _context;

    public GetInvoiceQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<InvoiceResponse?> Handle(GetInvoiceQuery request, CancellationToken cancellationToken)
    {
        var booking = await _context.Bookings
            .AsNoTracking()
            .Include(b => b.Customer)
            .Include(b => b.DeliveryStops)
            .Include(b => b.Payment)
            .FirstOrDefaultAsync(b => b.Id == request.BookingId, cancellationToken);

        if (booking == null) return null;

        decimal subtotal = booking.BaseFare + booking.DistanceFare + booking.StopFare + booking.AddOnFare;
        decimal tax = Math.Round(subtotal * 0.08m, 2); // 8% VAT/NBT tax estimate
        decimal grandTotal = booking.TotalFare > 0 ? booking.TotalFare : Math.Round(subtotal + tax, 2);
        decimal commission = booking.Commission > 0 ? booking.Commission : Math.Round(grandTotal * booking.CommissionRate, 2);
        decimal driverPayout = booking.DriverPayout > 0 ? booking.DriverPayout : (grandTotal - commission);

        string invoiceNum = $"INV-{booking.CreatedAt:yyyyMMdd}-{booking.Id.ToString()[..6].ToUpper()}";

        return new InvoiceResponse(
            booking.Id,
            invoiceNum,
            booking.CompletedAt ?? booking.CreatedAt,
            booking.Customer.FullName,
            booking.Customer.PhoneNumber,
            booking.PickupAddress,
            booking.DeliveryStops.Count,
            booking.RequiredVehicleSize,
            booking.CargoType,
            booking.BaseFare,
            booking.DistanceFare,
            booking.AddOnFare,
            subtotal,
            commission,
            driverPayout,
            tax,
            grandTotal,
            booking.PaymentMethod,
            booking.Payment?.Status ?? PaymentStatus.Pending
        );
    }
}
