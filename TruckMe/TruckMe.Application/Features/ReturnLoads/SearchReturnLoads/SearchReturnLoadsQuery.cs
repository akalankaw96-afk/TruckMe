using MediatR;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.DTOs;
using TruckMe.Domain.Enums;

namespace TruckMe.Application.Features.ReturnLoads.SearchReturnLoads;

public class SearchReturnLoadsQuery : IRequest<List<ReturnLoadDto>>
{
    public string? OriginCity { get; set; }
    public string? DestinationCity { get; set; }
    public VehicleSize? VehicleSize { get; set; }
}

public class SearchReturnLoadsQueryHandler : IRequestHandler<SearchReturnLoadsQuery, List<ReturnLoadDto>>
{
    private readonly IApplicationDbContext _context;

    public SearchReturnLoadsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ReturnLoadDto>> Handle(SearchReturnLoadsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.ReturnLoads
            .AsNoTracking()
            .Include(rl => rl.Driver)
            .ThenInclude(d => d.User)
            .Where(rl => !rl.IsBooked);

        if (!string.IsNullOrWhiteSpace(request.OriginCity))
        {
            query = query.Where(rl => rl.OriginCity.ToLower().Contains(request.OriginCity.ToLower()));
        }

        if (!string.IsNullOrWhiteSpace(request.DestinationCity))
        {
            query = query.Where(rl => rl.DestinationCity.ToLower().Contains(request.DestinationCity.ToLower()));
        }

        if (request.VehicleSize.HasValue)
        {
            query = query.Where(rl => rl.VehicleSize == request.VehicleSize.Value);
        }

        var results = await query.ToListAsync(cancellationToken);

        return results.Select(rl => new ReturnLoadDto(
            rl.Id,
            rl.DriverId,
            rl.Driver.User.FullName,
            rl.Driver.User.PhoneNumber,
            rl.Driver.VehiclePlateNumber,
            rl.OriginCity,
            rl.DestinationCity,
            rl.AvailableFrom,
            rl.AvailableUntil,
            rl.VehicleSize,
            rl.CapacityKg,
            rl.DiscountPercentage,
            rl.IsBooked,
            rl.Remarks
        )).ToList();
    }
}
