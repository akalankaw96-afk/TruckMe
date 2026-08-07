using Microsoft.AspNetCore.SignalR;

namespace TruckMe.API.Hubs;

public class TrackingHub : Hub
{
    public async Task JoinBookingTrackingGroup(string bookingId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"booking-{bookingId}");
    }

    public async Task LeaveBookingTrackingGroup(string bookingId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"booking-{bookingId}");
    }

    public async Task UpdateDriverLocation(string bookingId, decimal latitude, decimal longitude)
    {
        await Clients.Group($"booking-{bookingId}").SendAsync("ReceiveLocationUpdate", new
        {
            BookingId = bookingId,
            Latitude = latitude,
            Longitude = longitude,
            Timestamp = DateTime.UtcNow
        });
    }
}
