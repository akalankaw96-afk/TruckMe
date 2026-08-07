using Microsoft.AspNetCore.SignalR;

namespace TruckMe.API.Hubs;

public class JobHub : Hub
{
    public async Task RegisterDriverConnection(string driverId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"driver-{driverId}");
    }

    public async Task UnregisterDriverConnection(string driverId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"driver-{driverId}");
    }

    public async Task NotifyNearbyDrivers(string vehicleSize, string pickupAddress, decimal totalFare)
    {
        await Clients.All.SendAsync("ReceiveNewJobNotification", new
        {
            VehicleSize = vehicleSize,
            PickupAddress = pickupAddress,
            TotalFare = totalFare,
            Timestamp = DateTime.UtcNow
        });
    }
}
