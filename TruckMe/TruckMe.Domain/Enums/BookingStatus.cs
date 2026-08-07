namespace TruckMe.Domain.Enums;

public enum BookingStatus
{
    Pending = 0,
    Searching = 1,
    Assigned = 2,
    DriverEnRoute = 3,
    ArrivedAtPickup = 4,
    Loading = 5,
    InTransit = 6,
    AtDeliveryStop = 7,
    Unloading = 8,
    Delivered = 9,
    Completed = 10,
    Cancelled = 11
}
