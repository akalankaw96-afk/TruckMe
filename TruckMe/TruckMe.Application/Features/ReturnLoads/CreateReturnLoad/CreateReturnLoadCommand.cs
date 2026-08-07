using MediatR;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.DTOs;
using TruckMe.Domain.Entities;
using TruckMe.Domain.Enums;

namespace TruckMe.Application.Features.ReturnLoads.CreateReturnLoad;

public class CreateReturnLoadCommand : IRequest<ReturnLoadDto?>
{
    public Guid DriverId { get; set; }
    public string OriginCity { get; set; } = string.Empty;
    public string DestinationCity { get; set; } = string.Empty;
    public decimal OriginLatitude { get; set; }
    public decimal OriginLongitude { get; set; }
    public decimal DestinationLatitude { get; set; }
    public decimal DestinationLongitude { get; set; }
    public DateTime AvailableFrom { get; set; }
    public DateTime AvailableUntil { get; set; }
    public VehicleSize VehicleSize { get; set; }
    public int CapacityKg { get; set; }
    public decimal DiscountPercentage { get; set; } = 20.0m;
    public string? Remarks { get; set; }
}

public class CreateReturnLoadCommandHandler : IRequestHandler<CreateReturnLoadCommand, ReturnLoadDto?>
{
    private readonly IApplicationDbContext _context;

    public CreateReturnLoadCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ReturnLoadDto?> Handle(CreateReturnLoadCommand request, CancellationToken cancellationToken)
    {
        var driver = await _context.Drivers
            .Include(d => d.User)
            .FirstOrDefaultAsync(d => d.Id == request.DriverId, cancellationToken);

        if (driver == null) return null;

        var returnLoad = new ReturnLoad
        {
            Id = Guid.NewGuid(),
            DriverId = driver.Id,
            OriginCity = request.OriginCity,
            DestinationCity = request.DestinationCity,
            OriginLatitude = request.OriginLatitude,
            OriginLongitude = request.OriginLongitude,
            DestinationLatitude = request.DestinationLatitude,
            DestinationLongitude = request.DestinationLongitude,
            AvailableFrom = request.AvailableFrom,
            AvailableUntil = request.AvailableUntil,
            VehicleSize = request.VehicleSize,
            CapacityKg = request.CapacityKg,
            DiscountPercentage = request.DiscountPercentage,
            Remarks = request.Remarks,
            IsBooked = false
        };

        await _context.ReturnLoads.AddAsync(returnLoad, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return new ReturnLoadDto(
            returnLoad.Id,
            driver.Id,
            driver.User.FullName,
            driver.User.PhoneNumber,
            driver.VehiclePlateNumber,
            returnLoad.OriginCity,
            returnLoad.DestinationCity,
            returnLoad.AvailableFrom,
            returnLoad.AvailableUntil,
            returnLoad.VehicleSize,
            returnLoad.CapacityKg,
            returnLoad.DiscountPercentage,
            returnLoad.IsBooked,
            returnLoad.Remarks
        );
    }
}
