// Common/Behaviors/UnhandledExceptionBehavior.cs
using MediatR;

namespace TruckMe.Application.Common.Behaviors;

public sealed class UnhandledExceptionBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        try
        {
            return await next();
        }
        catch (Exception ex)
        {
            var requestName = typeof(TRequest).Name;
            Console.Error.WriteLine(
                $"[UnhandledException] Request: {requestName} | " +
                $"Exception: {ex.GetType().Name} | Message: {ex.Message}");
            throw;
        }
    }
}
