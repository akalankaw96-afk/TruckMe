// Features/Drivers/UpdateDriverStatus/UpdateDriverStatusCommandHandler.cs
using MediatR;
using TruckMe.Application.Common.Exceptions;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Application.Common.Models;
using TruckMe.Domain.Enums;
using TruckMe.Domain.Interfaces;

namespace TruckMe.Application.Features.Drivers.UpdateDriverStatus;

public sealed class UpdateDriverStatusCommandHandler
    : IRequestHandler<UpdateDriverStatusCommand, Result>
{
    private readonly IDriverRepository _driverRepository;
    private readonly IApplicationDbContext _context;

    public UpdateDriverStatusCommandHandler(
        IDriverRepository driverRepository,
        IApplicationDbContext context)
    {
        _driverRepository = driverRepository;
        _context = context;
    }

    public async Task<Result> Handle(
        UpdateDriverStatusCommand request,
        CancellationToken cancellationToken)
    {
        var driver = await _driverRepository.GetByIdAsync(request.DriverId);

        if (driver == null)
            throw new NotFoundException("Driver", request.DriverId);

        // Prevent going offline while on an active job
        if (!request.IsOnline && driver.Status == DriverStatus.OnJob)
            return Result.Failure("Cannot go offline while on an active job.");

        driver.IsOnline = request.IsOnline;
        driver.Status = request.IsOnline ? DriverStatus.Online : DriverStatus.Offline;
        driver.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
