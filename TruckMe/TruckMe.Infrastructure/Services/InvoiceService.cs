using TruckMe.Application.Common.Interfaces;
using TruckMe.Domain.Entities;

namespace TruckMe.Infrastructure.Services;

public class InvoiceService : IInvoiceService
{
    public Task<string> GenerateInvoicePdfUrlAsync(Booking booking, Payment payment, CancellationToken cancellationToken = default)
    {
        string invoiceNumber = $"INV-{payment.Id.ToString()[..8].ToUpper()}";
        string invoiceUrl = $"/api/payments/{booking.Id}/invoice/download";
        return Task.FromResult(invoiceUrl);
    }

    public Task<string> GenerateInvoiceHtmlAsync(Booking booking, Payment? payment, CancellationToken cancellationToken = default)
    {
        string invNum = payment != null ? $"INV-{payment.Id.ToString()[..8].ToUpper()}" : $"INV-{booking.Id.ToString()[..8].ToUpper()}";
        string bkNum = $"BK-{booking.Id.ToString()[..8].ToUpper()}";
        string dateStr = (payment?.PaidAt ?? DateTime.UtcNow).ToString("MMMM dd, yyyy - hh:mm tt");
        string payMethod = payment?.Method.ToString() ?? booking.PaymentMethod.ToString();
        string txnId = payment?.TransactionId ?? $"TXN-{Guid.NewGuid().ToString()[..10].ToUpper()}";

        string html = $@"<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <title>TruckMe Invoice - {invNum}</title>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 40px; background-color: #F4F7FB; color: #1A2B4A; }}
        .invoice-card {{ max-width: 750px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); }}
        .header {{ display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #E8EDF3; padding-bottom: 20px; margin-bottom: 25px; }}
        .brand {{ font-size: 28px; font-weight: 900; color: #1A2B4A; letter-spacing: 1px; }}
        .brand span {{ color: #F5A623; }}
        .badge {{ background: #27AE60; color: #ffffff; padding: 6px 16px; border-radius: 20px; font-weight: 700; font-size: 13px; display: inline-block; }}
        .info-grid {{ display: flex; justify-content: space-between; margin-bottom: 30px; line-height: 1.6; font-size: 14px; }}
        .info-col h4 {{ margin: 0 0 6px 0; color: #5A6B85; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }}
        .table {{ width: 100%; border-collapse: collapse; margin-bottom: 30px; }}
        .table th {{ background: #F8FAFC; text-align: left; padding: 12px; font-size: 12px; color: #5A6B85; text-transform: uppercase; border-bottom: 2px solid #E8EDF3; }}
        .table td {{ padding: 14px 12px; border-bottom: 1px solid #E8EDF3; font-size: 14px; }}
        .total-box {{ background: #1A2B4A; color: #ffffff; padding: 20px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }}
        .total-amount {{ font-size: 26px; font-weight: 900; color: #F5A623; }}
        .print-btn {{ display: block; width: 100%; text-align: center; background: #F5A623; color: #ffffff; text-decoration: none; padding: 14px 0; border-radius: 8px; font-weight: 800; margin-top: 25px; cursor: pointer; border: none; font-size: 16px; }}
        @media print {{ .print-btn {{ display: none; }} body {{ padding: 0; background: none; }} .invoice-card {{ box-shadow: none; border: none; }} }}
    </style>
</head>
<body>
    <div class=""invoice-card"">
        <div class=""header"">
            <div>
                <div class=""brand"">TRUCK<span>ME</span></div>
                <div style=""color: #5A6B85; font-size: 13px; margin-top: 4px;"">Official Transport & Freight Receipt</div>
            </div>
            <div>
                <span class=""badge"">✓ PAID IN FULL</span>
            </div>
        </div>

        <div class=""info-grid"">
            <div class=""info-col"">
                <h4>Invoice Details</h4>
                <strong>Invoice No:</strong> {invNum}<br>
                <strong>Booking Ref:</strong> {bkNum}<br>
                <strong>Date & Time:</strong> {dateStr}
            </div>
            <div class=""info-col"">
                <h4>Payment Info</h4>
                <strong>Payment Method:</strong> {payMethod}<br>
                <strong>Transaction ID:</strong> {txnId}<br>
                <strong>Status:</strong> Completed
            </div>
            <div class=""info-col"">
                <h4>Shipment Specs</h4>
                <strong>Cargo:</strong> {booking.CargoType}<br>
                <strong>Distance:</strong> {booking.TotalDistanceKm:F1} km<br>
                <strong>Vehicle:</strong> {booking.RequiredVehicleSize}
            </div>
        </div>

        <table class=""table"">
            <thead>
                <tr>
                    <th>Description</th>
                    <th style=""text-align: right;"">Amount (LKR)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Base Transport Fare</td>
                    <td style=""text-align: right;"">{booking.BaseFare:N2}</td>
                </tr>
                <tr>
                    <td>Distance Mileage Charge ({booking.TotalDistanceKm:F1} km)</td>
                    <td style=""text-align: right;"">{booking.DistanceFare:N2}</td>
                </tr>
                {(booking.HelperCount > 0 ? $"<tr><td>Helper Loading Services ({booking.HelperCount} helpers)</td><td style=\"text-align: right;\">{booking.StopFare:N2}</td></tr>" : "")}
                {(booking.IsExpress ? $"<tr><td>Express Delivery Multiplier</td><td style=\"text-align: right;\">{booking.AddOnFare:N2}</td></tr>" : "")}
            </tbody>
        </table>

        <div class=""total-box"">
            <div>
                <div style=""font-size: 12px; color: #A8B6CC; text-transform: uppercase;"">TOTAL AMOUNT PAID</div>
                <div style=""font-size: 12px; color: #ffffff; margin-top: 2px;"">Includes all taxes and service charges</div>
            </div>
            <div class=""total-amount"">LKR {booking.TotalFare:N2}</div>
        </div>

        <button class=""print-btn"" onclick=""window.print()"">🖨️ Print / Save PDF Invoice</button>
    </div>
</body>
</html>";

        return Task.FromResult(html);
    }
}
