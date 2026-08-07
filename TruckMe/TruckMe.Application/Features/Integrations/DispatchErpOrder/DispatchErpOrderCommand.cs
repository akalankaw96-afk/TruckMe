using MediatR;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.DTOs;
using TruckMe.Domain.Entities;
using TruckMe.Domain.Enums;

namespace TruckMe.Application.Features.Integrations.DispatchErpOrder;

public class DispatchErpOrderCommand : IRequest<ErpDispatchOrderResponse?>
{
    public string ExternalSystemName { get; set; } = string.Empty; // SAP, Oracle, Dynamics
    public string ExternalOrderId { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public string PickupAddress { get; set; } = string.Empty;
    public decimal PickupLatitude { get; set; }
    public decimal PickupLongitude { get; set; }
    public string DeliveryAddress { get; set; } = string.Empty;
    public decimal DeliveryLatitude { get; set; }
    public decimal DeliveryLongitude { get; set; }
    public CargoType CargoType { get; set; }
    public double WeightKg { get; set; }
    public VehicleSize VehicleSize { get; set; }
    public DateTime RequestedDeliveryDate { get; set; }
}

public class DispatchErpOrderCommandHandler : IRequestHandler<DispatchErpOrderCommand, ErpDispatchOrderResponse?>
{
    private readonly IApplicationDbContext _context;

    public DispatchErpOrderCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ErpDispatchOrderResponse?> Handle(DispatchErpOrderCommand request, CancellationToken cancellationToken)
    {
        var customer = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.CustomerId, cancellationToken);
        if (customer == null) return null;

        // Auto-create platform booking from ERP dispatch payload
        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            CustomerId = customer.Id,
            PickupAddress = request.PickupAddress,
            PickupLatitude = request.PickupLatitude,
            PickupLongitude = request.PickupLongitude,
            PickupContactName = customer.FullName,
            PickupContactPhone = customer.PhoneNumber,
            CargoType = request.CargoType,
            CargoWeightKg = request.WeightKg,
            RequiredVehicleSize = request.VehicleSize,
            BaseFare = 5000m,
            TotalFare = 8500m,
            Commission = 850m,
            DriverPayout = 7650m,
            ScheduledAt = request.RequestedDeliveryDate,
            Status = BookingStatus.Pending,
            ErpOrderReference = request.ExternalOrderId
        };

        booking.DeliveryStops.Add(new DeliveryStop
        {
            Id = Guid.NewGuid(),
            BookingId = booking.Id,
            Sequence = 1,
            Address = request.DeliveryAddress,
            Latitude = request.DeliveryLatitude,
            Longitude = request.DeliveryLongitude,
            RecipientName = "Warehouse Dispatch Supervisor",
            RecipientPhone = customer.PhoneNumber,
            Status = DeliveryStopStatus.Pending
        });

        await _context.Bookings.AddAsync(booking, cancellationToken);

        var erpOrder = new ErpOrder
        {
            Id = Guid.NewGuid(),
            ExternalSystemName = request.ExternalSystemName,
            ExternalOrderId = request.ExternalOrderId,
            CustomerId = customer.Id,
            BookingId = booking.Id,
            PickupAddress = request.PickupAddress,
            DeliveryAddress = request.DeliveryAddress,
            CargoType = request.CargoType,
            WeightKg = request.WeightKg,
            VehicleSize = request.VehicleSize,
            Status = "Dispatched",
            RequestedDeliveryDate = request.RequestedDeliveryDate
        };

        await _context.ErpOrders.AddAsync(erpOrder, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return new ErpDispatchOrderResponse(
            erpOrder.Id,
            booking.Id,
            erpOrder.ExternalOrderId,
            erpOrder.Status,
            DateTime.UtcNow
        );
    }
}
