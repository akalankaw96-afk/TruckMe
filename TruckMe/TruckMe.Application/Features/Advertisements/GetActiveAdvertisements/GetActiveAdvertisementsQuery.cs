using MediatR;
using Microsoft.EntityFrameworkCore;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.DTOs;

namespace TruckMe.Application.Features.Advertisements.GetActiveAdvertisements;

public class GetActiveAdvertisementsQuery : IRequest<List<AdvertisementDto>>
{
    public string Audience { get; set; } = "All";
}

public class GetActiveAdvertisementsQueryHandler : IRequestHandler<GetActiveAdvertisementsQuery, List<AdvertisementDto>>
{
    private readonly IApplicationDbContext _context;

    public GetActiveAdvertisementsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<AdvertisementDto>> Handle(GetActiveAdvertisementsQuery request, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        var ads = await _context.Advertisements
            .AsNoTracking()
            .Where(a => a.IsActive && a.StartDate <= now && a.EndDate >= now)
            .Where(a => a.TargetAudience == "All" || a.TargetAudience == request.Audience)
            .ToListAsync(cancellationToken);

        return ads.Select(a => new AdvertisementDto(
            a.Id,
            a.Title,
            a.Description,
            a.ImageUrl,
            a.TargetUrl,
            a.StartDate,
            a.EndDate,
            a.TargetAudience
        )).ToList();
    }
}
