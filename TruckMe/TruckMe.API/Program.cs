using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Microsoft.EntityFrameworkCore;
using TruckMe.API.Hubs;
using TruckMe.API.Services;
using TruckMe.Application;
using TruckMe.Application.Common.Interfaces;
using TruckMe.Infrastructure;
using TruckMe.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// 1. Add Application and Infrastructure Clean Architecture Services
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

// 2. Add SignalR for real-time tracking and job dispatch
builder.Services.AddSignalR();
builder.Services.AddScoped<INotificationService, SignalRNotificationService>();

// 3. Add Controllers
builder.Services.AddControllers();

// 4. Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// 5. Add JWT Bearer Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "TruckMeSuperSecretJWTKey2026SriLankaPlatform!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "TruckMeAPI";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "TruckMeUsers";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

// 6. Configure Swagger/OpenAPI with Bearer Authentication
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "TruckMe API",
        Version = "v1",
        Description = "Digital Truck Booking & Distribution Management Platform API"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: 'Bearer 12345abcdef'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Auto-apply database migrations & seed demo data on startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<TruckMeDbContext>();
    try
    {
        dbContext.Database.Migrate();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Migration notice: {ex.Message}");
    }

    // Ensure FcmToken column exists on Users table
    try
    {
        dbContext.Database.ExecuteSqlRaw(@"
            IF NOT EXISTS (
                SELECT * FROM sys.columns 
                WHERE object_id = OBJECT_ID(N'[Users]') AND name = N'FcmToken'
            )
            BEGIN
                ALTER TABLE [Users] ADD [FcmToken] NVARCHAR(500) NULL;
            END;
        ");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Schema check notice: {ex.Message}");
    }

    DbSeeder.SeedAsync(dbContext).GetAwaiter().GetResult();
}

// 7. Configure Middleware Pipeline
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "TruckMe API v1");
    c.RoutePrefix = string.Empty; // Serve Swagger UI at app root (http://localhost:5000/)
});

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<TrackingHub>("/hubs/tracking");
app.MapHub<JobHub>("/hubs/jobs");

app.Run();
