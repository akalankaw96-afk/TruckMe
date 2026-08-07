using MediatR;
using Microsoft.AspNetCore.Mvc;
using TruckMe.Application.DTOs;
using TruckMe.Application.Features.Integrations.DispatchErpOrder;
using TruckMe.Application.Features.Integrations.GetErpOrderStatus;

namespace TruckMe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class IntegrationsController : ControllerBase
{
    private readonly IMediator _mediator;

    public IntegrationsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// ERP & Warehouse Dispatch endpoint (SAP, Oracle, Microsoft Dynamics) to dispatch orders into TruckMe.
    /// </summary>
    [HttpPost("erp/dispatch")]
    public async Task<ActionResult<ErpDispatchOrderResponse>> DispatchErpOrder([FromBody] ErpDispatchOrderRequest request)
    {
        var result = await _mediator.Send(new DispatchErpOrderCommand
        {
            ExternalSystemName = request.ExternalSystemName,
            ExternalOrderId = request.ExternalOrderId,
            CustomerId = request.CustomerId,
            PickupAddress = request.PickupAddress,
            PickupLatitude = request.PickupLatitude,
            PickupLongitude = request.PickupLongitude,
            DeliveryAddress = request.DeliveryAddress,
            DeliveryLatitude = request.DeliveryLatitude,
            DeliveryLongitude = request.DeliveryLongitude,
            CargoType = request.CargoType,
            WeightKg = request.WeightKg,
            VehicleSize = request.VehicleSize,
            RequestedDeliveryDate = request.RequestedDeliveryDate
        });

        if (result == null) return BadRequest("Invalid customer associated with ERP order.");
        return Ok(result);
    }

    /// <summary>
    /// Checks live status sync of an ERP dispatch order.
    /// </summary>
    [HttpGet("erp/order-status/{externalOrderId}")]
    public async Task<ActionResult<ErpOrderStatusDto>> GetErpOrderStatus(string externalOrderId)
    {
        var result = await _mediator.Send(new GetErpOrderStatusQuery { ExternalOrderId = externalOrderId });
        if (result == null) return NotFound("ERP Order reference not found.");
        return Ok(result);
    }
}
