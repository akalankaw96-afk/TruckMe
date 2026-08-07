// DependencyInjection.cs
using FluentValidation;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using TruckMe.Application.Common.Behaviors;

namespace TruckMe.Application;

public static class ApplicationServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Register all MediatR handlers from this assembly
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(ApplicationServiceCollectionExtensions).Assembly);
        });

        // Register all FluentValidation validators from this assembly
        services.AddValidatorsFromAssembly(
            typeof(ApplicationServiceCollectionExtensions).Assembly);

        // Register MediatR pipeline behaviors (order matters — they form a pipeline):
        //   LoggingBehavior → ValidationBehavior → UnhandledExceptionBehavior → Handler

        services.AddTransient(
            typeof(IPipelineBehavior<,>),
            typeof(LoggingBehavior<,>));

        services.AddTransient(
            typeof(IPipelineBehavior<,>),
            typeof(ValidationBehavior<,>));

        services.AddTransient(
            typeof(IPipelineBehavior<,>),
            typeof(UnhandledExceptionBehavior<,>));

        // IGeoService, ITokenService, ICurrentUserService implementations are registered
        // in the Infrastructure layer (TruckMe.Infrastructure) to keep concerns separated.
        // Example in Infrastructure DI:
        //   services.AddScoped<IGeoService, HaversineGeoService>();
        //   services.AddScoped<ITokenService, JwtTokenService>();
        //   services.AddScoped<ICurrentUserService, CurrentUserService>();

        return services;
    }
}
