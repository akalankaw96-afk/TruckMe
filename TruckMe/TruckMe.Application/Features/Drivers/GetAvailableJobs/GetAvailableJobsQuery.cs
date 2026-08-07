// Features/Drivers/GetAvailableJobs/GetAvailableJobsQuery.cs
using MediatR;
using TruckMe.Application.DTOs;

namespace TruckMe.Application.Features.Drivers.GetAvailableJobs;

public record GetAvailableJobsQuery : IRequest<List<AvailableJobDto>>
{
    public Guid DriverId { get; init; }
}
