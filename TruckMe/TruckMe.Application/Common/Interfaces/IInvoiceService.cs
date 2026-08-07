using TruckMe.Domain.Entities;

namespace TruckMe.Application.Common.Interfaces;

public interface IInvoiceService
{
    Task<string> GenerateInvoicePdfUrlAsync(Booking booking, Payment payment, CancellationToken cancellationToken = default);
    Task<string> GenerateInvoiceHtmlAsync(Booking booking, Payment? payment, CancellationToken cancellationToken = default);
}
