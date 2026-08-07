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

    public PaymentsController(IMediator mediator)
    {
        _mediator = mediator;
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

public class CustomerPaymentRequest
{
    public Guid BookingId { get; set; }
    public decimal Amount { get; set; }
    public string? Method { get; set; }
    public string? Provider { get; set; }
    public string? TransactionId { get; set; }
}
