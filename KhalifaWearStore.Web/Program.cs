using System.Text.Json.Serialization;
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
            app.UseMiddleware<GlobalErrorHandlerMiddleware>();

            if (app.Environment.IsDevelopment())
            {
                app.UseSwaggerDocumentation();
            }

            app.UseHttpsRedirection();
            app.UseStaticFiles();

            app.UseRouting();
            app.UseRateLimiter();

            app.UseCors("CorsPolicy");

            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();
            app.MapHub<OrderNotificationHub>("/hubs/orders");
            app.MapHub<SupportChatHub>("/hubs/chat");

            app.Run();
        }
    }
}
