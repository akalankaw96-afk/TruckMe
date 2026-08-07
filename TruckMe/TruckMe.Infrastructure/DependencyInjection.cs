// TruckMe.Infrastructure/DependencyInjection.cs
// Additional NuGet packages needed for this project:
//   dotnet add src/TruckMe.Infrastructure package System.IdentityModel.Tokens.Jwt
//   dotnet add src/TruckMe.Infrastructure package Microsoft.AspNetCore.Http.Abstractions
//   dotnet add src/TruckMe.Infrastructure package Microsoft.EntityFrameworkCore.SqlServer
//   dotnet add src/TruckMe.Infrastructure package Microsoft.EntityFrameworkCore.Design

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Domain.Interfaces;
using TruckMe.Infrastructure.Persistence;
using TruckMe.Infrastructure.Persistence.Repositories;
using TruckMe.Infrastructure.Services;

namespace TruckMe.Infrastructure;

public static class InfrastructureServiceCollectionExtensions
{
    /// <summary>
    /// Registers all Infrastructure-layer services with the DI container.
    /// Call this from the API project's Program.cs or Startup.cs.
    /// </summary>
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // ── Database ──────────────────────────────────────────────────────
        string? connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrEmpty(connectionString) || configuration.GetValue<bool>("UseInMemoryDatabase"))
        {
            services.AddDbContext<TruckMeDbContext>(options =>
                options.UseInMemoryDatabase("TruckMeDb"));
        }
        else
        {
            services.AddDbContext<TruckMeDbContext>(options =>
                options.UseSqlServer(
                    connectionString,
                    sqlOptions =>
                    {
                        sqlOptions.EnableRetryOnFailure(
                            maxRetryCount: 5,
                            maxRetryDelay: TimeSpan.FromSeconds(10),
                            errorNumbersToAdd: null);
                    }));
        }

        // Expose the DbContext through the Application-layer interface
        services.AddScoped<IApplicationDbContext>(
            sp => sp.GetRequiredService<TruckMeDbContext>());

        // ── Repositories ──────────────────────────────────────────────────
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IDriverRepository, DriverRepository>();
        services.AddScoped<IBookingRepository, BookingRepository>();
        services.AddScoped<IVehicleRepository, VehicleRepository>();

        // ── Application services ──────────────────────────────────────────

        // GeoService is stateless (pure math) — Singleton is safe and avoids
        // re-allocating the service on every request.
        services.AddSingleton<IGeoService, GeoService>();

        // TokenService reads IConfiguration (Singleton) but has no mutable
        // state — Scoped keeps it aligned with the request lifetime.
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IInvoiceService, InvoiceService>();
        services.AddHttpClient<IPushNotificationService, ExpoPushNotificationService>();

        // CurrentUserService depends on IHttpContextAccessor which is Scoped.
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        // IHttpContextAccessor — required by CurrentUserService to reach the
        // ambient HttpContext from within non-controller classes.
        services.AddHttpContextAccessor();

        return services;
    }
}
