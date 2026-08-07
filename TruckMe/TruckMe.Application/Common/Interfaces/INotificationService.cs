namespace TruckMe.Application.Common.Interfaces;

public interface INotificationService
{
    Task PublishLocationUpdateAsync(string bookingId, decimal latitude, decimal longitude, CancellationToken cancellationToken = default);
    Task NotifyDriverJobAcceptedAsync(string bookingId, string driverId, string customerId, CancellationToken cancellationToken = default);
    Task NotifyStopStatusUpdatedAsync(string bookingId, Guid stopId, string status, CancellationToken cancellationToken = default);
    Task BroadcastNewJobAvailableAsync(string bookingId, string vehicleSize, string pickupAddress, decimal totalFare, CancellationToken cancellationToken = default);
}
