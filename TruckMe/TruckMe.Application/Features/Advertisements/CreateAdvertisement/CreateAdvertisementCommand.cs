using MediatR;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.DTOs;
using TruckMe.Domain.Entities;

namespace TruckMe.Application.Features.Advertisements.CreateAdvertisement;

public class CreateAdvertisementCommand : IRequest<AdvertisementDto>
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string TargetUrl { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string TargetAudience { get; set; } = "All";
}

public class CreateAdvertisementCommandHandler : IRequestHandler<CreateAdvertisementCommand, AdvertisementDto>
{
    private readonly IApplicationDbContext _context;

    public CreateAdvertisementCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<AdvertisementDto> Handle(CreateAdvertisementCommand request, CancellationToken cancellationToken)
    {
        var ad = new Advertisement
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            Description = request.Description,
            ImageUrl = request.ImageUrl,
            TargetUrl = request.TargetUrl,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            TargetAudience = request.TargetAudience,
            IsActive = true
        };

        await _context.Advertisements.AddAsync(ad, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return new AdvertisementDto(
            ad.Id,
            ad.Title,
            ad.Description,
            ad.ImageUrl,
            ad.TargetUrl,
            ad.StartDate,
            ad.EndDate,
            ad.TargetAudience
        );
    }
}
