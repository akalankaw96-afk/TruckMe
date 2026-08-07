using MediatR;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.DTOs;

namespace TruckMe.Application.Features.Integrations.GetErpOrderStatus;

public class GetErpOrderStatusQuery : IRequest<ErpOrderStatusDto?>
{
    public string ExternalOrderId { get; set; } = string.Empty;
}

public class GetErpOrderStatusQueryHandler : IRequestHandler<GetErpOrderStatusQuery, ErpOrderStatusDto?>
{
    private readonly IApplicationDbContext _context;

    public GetErpOrderStatusQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ErpOrderStatusDto?> Handle(GetErpOrderStatusQuery request, CancellationToken cancellationToken)
    {
        var erpOrder = await _context.ErpOrders
            .AsNoTracking()
            .Include(e => e.Booking)
            .FirstOrDefaultAsync(e => e.ExternalOrderId == request.ExternalOrderId, cancellationToken);

        if (erpOrder == null) return null;

        string platformStatus = erpOrder.Booking?.Status.ToString() ?? erpOrder.Status;

        return new ErpOrderStatusDto(
            erpOrder.ExternalOrderId,
            erpOrder.ExternalSystemName,
            platformStatus,
            erpOrder.BookingId,
            erpOrder.UpdatedAt ?? erpOrder.CreatedAt
        );
    }
}
