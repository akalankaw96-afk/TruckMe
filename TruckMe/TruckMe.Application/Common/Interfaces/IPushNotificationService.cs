namespace TruckMe.Application.Common.Interfaces;

public interface IPushNotificationService
{
    Task SendPushNotificationAsync(
        string pushToken,
        string title,
        string message,
        object? data = null,
        CancellationToken cancellationToken = default);

    Task SendBulkPushNotificationAsync(
        IEnumerable<string> pushTokens,
        string title,
        string message,
        object? data = null,
        CancellationToken cancellationToken = default);
}
