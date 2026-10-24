using System.Text.Json.Serialization;
using Microsoft.AspNetCore.HttpOverrides;
using KhalifaWearStore.Abstraction.IServices.Order;
using KhalifaWearStore.Persistence.Extensions;
using KhalifaWearStore.Persistence.ProgramService;
using KhalifaWearStore.Presentation.Controllers;
using KhalifaWearStore.Presentation.Extensions;
using KhalifaWearStore.Services.AutoMapper;
using KhalifaWearStore.Web.Extensions;
using KhalifaWearStore.Web.Hubs;
using KhalifaWearStore.Web.Middleware;

namespace KhalifaWearStore.Web
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // ==========================================
            // 1. Database & Identity
            // ==========================================
            builder.Services.InjectDatabaseService(builder.Configuration);
            builder.Services.InjectIdentityCore();

            // ==========================================
            // 2. Application Services & Third-Party
            // ==========================================
            builder.Services.AddApplicationService();
            builder.Services.AddScoped<IOrderNotificationService, SignalROrderNotificationService>();
            builder.Services.AddSingleton<SupportChatStore>();
            builder.Services.AddSignalR();
            builder.Services.InjectAutoMapperService();
            builder.Services.InjectRateLimiting();

            // ==========================================
            // 3. Security, CORS, & Protection
            // ==========================================
            builder.Services.Configure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
                options.KnownIPNetworks.Clear();
                options.KnownProxies.Clear();
            });
            builder.Services.AddHsts(options =>
            {
                options.Preload = true;
                options.IncludeSubDomains = true;
                options.MaxAge = TimeSpan.FromDays(365);
            });
            builder.Services.AddHttpsRedirection(options =>
            {
                options.RedirectStatusCode = StatusCodes.Status308PermanentRedirect;
                if (builder.Environment.IsDevelopment())
                {
                    options.HttpsPort = 7050;
                }
            });
            builder.Services.AddJwtAuthentication(builder.Configuration, builder.Environment);
            builder.Services.AddCustomCors(builder.Configuration);
            builder.Services.AddDataProtection();

            // ==========================================
            // 4. Controllers & JSON Options
            // ==========================================
            builder.Services.AddControllers()
                .AddApplicationPart(typeof(AppBaseController).Assembly)
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
                })
                .ConfigureApiBehaviorOptions(options =>
                {
                    options.InvalidModelStateResponseFactory = context =>
                    {
                        var errors = context.ModelState
                            .Where(kvp => kvp.Value?.Errors.Count > 0)
                            .SelectMany(kvp =>
                            {
                                var rawKey = kvp.Key.Split('.').Last();
                                var camelKey = string.IsNullOrEmpty(rawKey)
                                    ? rawKey
                                    : char.ToLowerInvariant(rawKey[0]) + rawKey[1..];
                                return kvp.Value!.Errors.Select(e =>
                                    string.IsNullOrEmpty(camelKey)
                                        ? e.ErrorMessage
                                        : $"{camelKey}:{e.ErrorMessage}");
                            })
                            .ToList();

                        var firstMsg = errors.FirstOrDefault()?.Split(':', 2).Last() ?? "Validation failed.";
                        var response = new KhalifaWearStore.Shared.Common.Response.ApiResponse<object>(
                            firstMsg,
                            StatusCodes.Status400BadRequest,
                            errors);

                        return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(response);
                    };
                });

            // ==========================================
            // 5. Swagger Setup
            // ==========================================
            builder.Services.AddSwaggerDocumentation();

            var app = builder.Build();

            // ==========================================
            // 6. Database Initialization (Migrations & Seeding)
            // ==========================================
            await app.SeedDatabaseAsync();

            // ==========================================
            // 7. HTTP Request Pipeline (Middleware)
            // ==========================================
            app.UseForwardedHeaders();
            app.UseHsts();
            app.UseHttpsRedirection();

            app.UseMiddleware<GlobalErrorHandlerMiddleware>();

            app.Use(async (context, next) =>
            {
                context.Response.Headers["X-Content-Type-Options"] = "nosniff";
                context.Response.Headers["X-Frame-Options"] = "DENY";
                context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
                context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
                context.Response.Headers["Content-Security-Policy"] = "upgrade-insecure-requests";
                context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload";
                await next();
            });

            if (app.Environment.IsDevelopment())
            {
                app.UseSwaggerDocumentation();
            }

            app.UseDefaultFiles();
            app.UseStaticFiles();

            // Database-backed media fallback for /Images/* (serves from StoredMedia table in SQL Server if not cached on local disk)
            app.Use(async (context, next) =>
            {
                if (context.Request.Path.StartsWithSegments("/Images", StringComparison.OrdinalIgnoreCase))
                {
                    var relativePath = context.Request.Path.Value?.TrimStart('/') ?? string.Empty;
                    if (!string.IsNullOrWhiteSpace(relativePath))
                    {
                        using var scope = app.Services.CreateScope();
                        var db = scope.ServiceProvider.GetRequiredService<KhalifaWearStore.Persistence.KhalifaWearStoreDbContext.KhalifaDbContext>();
                        var media = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
                            db.StoredMedia,
                            m => m.RelativePath == relativePath && !m.IsDeleted);

                        if (media != null && media.FileBytes.Length > 0)
                        {
                            try
                            {
                                var webRoot = app.Environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                                var localPath = Path.GetFullPath(Path.Combine(webRoot, relativePath));
                                if (localPath.StartsWith(Path.GetFullPath(webRoot), StringComparison.OrdinalIgnoreCase))
                                {
                                    Directory.CreateDirectory(Path.GetDirectoryName(localPath)!);
                                    await File.WriteAllBytesAsync(localPath, media.FileBytes);
                                }
                            }
                            catch
                            {
                                // Ignore disk cache write errors
                            }

                            context.Response.ContentType = media.ContentType;
                            await context.Response.Body.WriteAsync(media.FileBytes);
                            return;
                        }
                    }
                }
                await next();
            });

            app.UseRouting();
            app.UseRateLimiter();

            app.UseCors("CorsPolicy");

            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();
            app.MapHub<OrderNotificationHub>("/hubs/orders");
            app.MapHub<SupportChatHub>("/hubs/chat");
            app.MapFallbackToFile("index.html");

            app.Run();
        }
    }
}
