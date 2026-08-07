// Features/Payments/ProcessPayment/ProcessPaymentCommandValidator.cs
using FluentValidation;
using TruckMe.Domain.Enums;

namespace TruckMe.Application.Features.Payments.ProcessPayment;

public sealed class ProcessPaymentCommandValidator : AbstractValidator<ProcessPaymentCommand>
{
    public ProcessPaymentCommandValidator()
    {
        RuleFor(x => x.BookingId)
            .NotEmpty().WithMessage("Booking ID is required.");

        // Card payments require a transaction reference from the payment gateway
        When(x => x.Method == PaymentMethod.Card, () =>
        {
            RuleFor(x => x.TransactionId)
                .NotEmpty().WithMessage("Transaction ID is required for card payments.");
        });
    }
}
