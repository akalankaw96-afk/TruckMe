// Common/Behaviors/LoggingBehavior.cs
using MediatR;

namespace TruckMe.Application.Common.Behaviors;

public sealed class LoggingBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;

        Console.WriteLine($"[Logging] Handling request: {requestName} at {DateTime.UtcNow:O}");

        var response = await next();

        Console.WriteLine($"[Logging] Handled request: {requestName} — " +
                          $"Response type: {typeof(TResponse).Name} at {DateTime.UtcNow:O}");

        return response;
    }
}
