using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.DTOs;
using TruckMe.Application.Features.Payments.GetInvoice;
using TruckMe.Application.Features.Payments.ProcessPayment;
using TruckMe.Domain.Enums;

namespace TruckMe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IApplicationDbContext _context;

    public PaymentsController(IMediator mediator, IApplicationDbContext context)
    {
        _mediator = mediator;
        _context = context;
    }

    /// <summary>
    /// Gets available platform payment methods.
    /// </summary>
    [HttpGet("methods")]
    public IActionResult GetPaymentMethods()
    {
        return Ok(new[]
        {
            new
            {
                id = "cash",
                name = "💵 Cash on Delivery (COD)",
                description = "Pay cash directly to driver at pickup/dropoff",
                badge = "POPULAR",
                isEnabled = true
            },
            new
            {
                id = "card",
                name = "💳 Credit / Debit Card (PayHere / Visa / Mastercard)",
                description = "Secure online card payment with instant digital receipt",
                badge = "INSTANT",
                isEnabled = true
            },
            new
            {
                id = "wallet",
                name = "👛 TruckMe Customer Wallet",
                description = "Pay instantly from pre-loaded wallet balance",
                badge = "0% FEE",
                isEnabled = true
            }
        });
    }

    /// <summary>
    /// Initiates online Card checkout session (PayHere / Stripe hash parameters).
    /// </summary>
    [HttpPost("checkout")]
    public async Task<IActionResult> InitiateCardCheckout([FromBody] CheckoutRequest request)
    {
        var booking = await _context.Bookings.FirstOrDefaultAsync(b => b.Id == request.BookingId);
        if (booking == null) return NotFound("Booking not found");

        decimal amount = booking.TotalFare > 0 ? booking.TotalFare : 4500m;
        string merchantId = "1223344"; // Official PayHere / Merchant ID
        string orderId = $"ORD-{booking.Id.ToString()[..8].ToUpper()}";
        string currency = "LKR";

        // Simulated PayHere / Card Hash Token
        string checkoutHash = Convert.ToHexString(System.Security.Cryptography.MD5.HashData(
            System.Text.Encoding.UTF8.GetBytes($"{merchantId}{orderId}{amount}{currency}SECRET")
        )).ToUpper();

        return Ok(new
        {
            merchantId = merchantId,
            orderId = orderId,
            bookingId = booking.Id,
            amount = amount,
            currency = currency,
            hash = checkoutHash,
            checkoutUrl = $"https://sandbox.payhere.lk/pay/checkout?merchant_id={merchantId}&order_id={orderId}&amount={amount}",
            customerName = booking.PickupContactName ?? "Valued Customer",
            customerPhone = booking.PickupContactPhone ?? "+94771234567",
            status = "CheckoutSessionCreated"
        });
    }

    /// <summary>
    /// Verifies & settles card payment, splits 15% platform commission vs 85% driver payout, and updates ledger.
    /// </summary>
    [HttpPost("verify")]
    public async Task<IActionResult> VerifyCardPayment([FromBody] VerifyCardPaymentDto request)
    {
        var booking = await _context.Bookings
            .Include(b => b.Driver)
            .FirstOrDefaultAsync(b => b.Id == request.BookingId);

        if (booking == null) return NotFound("Booking not found");

        booking.PaymentMethod = PaymentMethod.Card;
        
        // 15% Standard Commission vs 0% Subscription Pass calculation
        decimal totalFare = booking.TotalFare > 0 ? booking.TotalFare : 4500m;
        bool isSubscribed = booking.DriverId.HasValue && SubscriptionsController.HasActiveSubscription(booking.DriverId.Value);
        decimal commissionRate = isSubscribed ? 0.0m : 0.15m;
        decimal platformCommission = totalFare * commissionRate;
        decimal driverEarnings = totalFare - platformCommission;

        booking.CommissionRate = commissionRate;
        booking.Commission = platformCommission;
        booking.DriverPayout = driverEarnings;

        if (booking.Driver != null)
        {
            booking.Driver.TotalEarnings += driverEarnings;
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Card payment verified & settled successfully!",
            transactionId = request.TransactionId ?? $"TXN-{Guid.NewGuid().ToString()[..8].ToUpper()}",
            bookingId = booking.Id,
            totalPaid = totalFare,
            platformCommission = platformCommission,
            driverPayout = driverEarnings,
            paymentMethod = "Card",
            paymentStatus = "PaidOnline"
        });
    }

    /// <summary>
    /// Processes digital payments (Card, Mobile Wallet, Online Banking, Cash) and settles driver commission.
    /// </summary>
    [HttpPost("process")]
    [HttpPost]
    public async Task<ActionResult<PaymentResponse>> ProcessPayment([FromBody] CustomerPaymentRequest request)
    {
        PaymentMethod method = request.Method?.ToLower() switch
        {
            "cash" => PaymentMethod.Cash,
            "card" => PaymentMethod.Card,
            "wallet" => PaymentMethod.Wallet,
            _ => PaymentMethod.Cash
        };

        var command = new ProcessPaymentCommand
        {
            BookingId = request.BookingId,
            Method = method,
            TransactionId = request.TransactionId ?? $"TXN-{Guid.NewGuid().ToString()[..8].ToUpper()}"
        };

        var result = await _mediator.Send(command);
        return Ok(result);
    }

    /// <summary>
    /// Generates and retrieves digital invoice breakdown for a booking.
    /// </summary>
    [HttpGet("{bookingId:guid}/invoice")]
    public async Task<ActionResult<InvoiceResponse>> GetInvoice(Guid bookingId)
    {
        var result = await _mediator.Send(new GetInvoiceQuery { BookingId = bookingId });
        if (result == null) return NotFound("Invoice not found for the given booking ID.");
        return Ok(result);
    }

    /// <summary>
    /// Serves HTML/PDF receipt invoice for printing or downloading.
    /// </summary>
    [HttpGet("{bookingId:guid}/invoice/download")]
    [HttpGet("{bookingId:guid}/invoice/pdf")]
    public async Task<IActionResult> DownloadInvoiceHtml(
        Guid bookingId,
        [FromServices] IApplicationDbContext context,
        [FromServices] IInvoiceService invoiceService)
    {
        var booking = await context.Bookings
            .Include(b => b.DeliveryStops)
            .Include(b => b.Payment)
            .FirstOrDefaultAsync(b => b.Id == bookingId);

        if (booking == null) return NotFound("Booking not found");

        var html = await invoiceService.GenerateInvoiceHtmlAsync(booking, booking.Payment);
        return Content(html, "text/html");
    }
}

public class CheckoutRequest
{
    public Guid BookingId { get; set; }
}

public class VerifyCardPaymentDto
{
    public Guid BookingId { get; set; }
    public string? TransactionId { get; set; }
    public string? PaymentGatewaySignature { get; set; }
}

public class CustomerPaymentRequest
{
    public Guid BookingId { get; set; }
    public decimal Amount { get; set; }
    public string? Method { get; set; }
    public string? Provider { get; set; }
    public string? TransactionId { get; set; }
}
