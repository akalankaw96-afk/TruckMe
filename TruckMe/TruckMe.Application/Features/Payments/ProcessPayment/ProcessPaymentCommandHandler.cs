// Features/Payments/ProcessPayment/ProcessPaymentCommandHandler.cs
using MediatR;
using TruckMe.Application.Common.Exceptions;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.DTOs;
using TruckMe.Domain.Entities;
using TruckMe.Domain.Enums;
using TruckMe.Domain.Interfaces;

namespace TruckMe.Application.Features.Payments.ProcessPayment;

public sealed class ProcessPaymentCommandHandler : IRequestHandler<ProcessPaymentCommand, PaymentResponse>
{
    private readonly IBookingRepository _bookingRepository;
    private readonly IInvoiceService _invoiceService;
    private readonly IApplicationDbContext _context;

    public ProcessPaymentCommandHandler(
        IBookingRepository bookingRepository,
        IInvoiceService invoiceService,
        IApplicationDbContext context)
    {
        _bookingRepository = bookingRepository;
        _invoiceService = invoiceService;
        _context = context;
    }

    public async Task<PaymentResponse> Handle(
        ProcessPaymentCommand request,
        CancellationToken cancellationToken)
    {
        var booking = await _bookingRepository.GetWithDetailsAsync(request.BookingId);

        if (booking == null)
            throw new NotFoundException("Booking", request.BookingId);

        // Prevent duplicate payments
        if (booking.Payment != null && booking.Payment.Status == PaymentStatus.Paid)
        {
            throw new ValidationException(new Dictionary<string, string[]>
            {
                { "Payment", new[] { "This booking has already been paid." } }
            });
        }

        // Create the payment record
        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            BookingId = request.BookingId,
            Amount = booking.TotalFare,
            Method = request.Method,
            Status = PaymentStatus.Paid,
            TransactionId = request.TransactionId,
            CommissionAmount = booking.Commission,
            DriverPayoutAmount = booking.DriverPayout,
            PaidAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Generate and store invoice URL
        payment.InvoiceUrl = await _invoiceService.GenerateInvoicePdfUrlAsync(booking, payment, cancellationToken);

        await _context.Payments.AddAsync(payment, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return new PaymentResponse(
            Id: payment.Id,
            BookingId: payment.BookingId,
            Amount: payment.Amount,
            Method: payment.Method.ToString(),
            Status: payment.Status.ToString(),
            TransactionId: payment.TransactionId,
            CommissionAmount: payment.CommissionAmount,
            DriverPayoutAmount: payment.DriverPayoutAmount,
            PaidAt: payment.PaidAt,
            InvoiceUrl: payment.InvoiceUrl
        );
    }
}
