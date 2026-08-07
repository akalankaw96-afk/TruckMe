using Microsoft.AspNetCore.SignalR;
using TruckMe.API.Hubs;
using TruckMe.Application.Common.Interfaces;

namespace TruckMe.API.Services;

public class SignalRNotificationService : INotificationService
{
    private readonly IHubContext<TrackingHub> _trackingHubContext;
    private readonly IHubContext<JobHub> _jobHubContext;

    public SignalRNotificationService(
        IHubContext<TrackingHub> trackingHubContext,
        IHubContext<JobHub> jobHubContext)
    {
        _trackingHubContext = trackingHubContext;
        _jobHubContext = jobHubContext;
    }

    public async Task PublishLocationUpdateAsync(string bookingId, decimal latitude, decimal longitude, CancellationToken cancellationToken = default)
    {
        await _trackingHubContext.Clients.Group($"booking-{bookingId}").SendAsync("ReceiveLocationUpdate", new
        {
            BookingId = bookingId,
            Latitude = latitude,
            Longitude = longitude,
            Timestamp = DateTime.UtcNow
        }, cancellationToken);
    }

    public async Task NotifyDriverJobAcceptedAsync(string bookingId, string driverId, string customerId, CancellationToken cancellationToken = default)
    {
        await _trackingHubContext.Clients.Group($"booking-{bookingId}").SendAsync("DriverAssigned", new
        {
            BookingId = bookingId,
            DriverId = driverId,
            CustomerId = customerId,
            Timestamp = DateTime.UtcNow
        }, cancellationToken);
    }

    public async Task NotifyStopStatusUpdatedAsync(string bookingId, Guid stopId, string status, CancellationToken cancellationToken = default)
    {
        await _trackingHubContext.Clients.Group($"booking-{bookingId}").SendAsync("StopStatusChanged", new
        {
            BookingId = bookingId,
            StopId = stopId,
            Status = status,
            Timestamp = DateTime.UtcNow
        }, cancellationToken);
    }

    public async Task BroadcastNewJobAvailableAsync(string bookingId, string vehicleSize, string pickupAddress, decimal totalFare, CancellationToken cancellationToken = default)
    {
        await _jobHubContext.Clients.All.SendAsync("ReceiveNewJobNotification", new
        {
            BookingId = bookingId,
            VehicleSize = vehicleSize,
            PickupAddress = pickupAddress,
            TotalFare = totalFare,
            Timestamp = DateTime.UtcNow
        }, cancellationToken);
    }
}
