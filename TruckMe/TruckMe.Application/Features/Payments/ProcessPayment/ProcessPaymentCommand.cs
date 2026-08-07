// Features/Payments/ProcessPayment/ProcessPaymentCommand.cs
using MediatR;
using TruckMe.Application.DTOs;
using TruckMe.Domain.Enums;

namespace TruckMe.Application.Features.Payments.ProcessPayment;

public record ProcessPaymentCommand : IRequest<PaymentResponse>
{
    public Guid BookingId { get; init; }
    public PaymentMethod Method { get; init; }
    public string? TransactionId { get; init; }
    public Guid ProcessedByUserId { get; init; }
}
