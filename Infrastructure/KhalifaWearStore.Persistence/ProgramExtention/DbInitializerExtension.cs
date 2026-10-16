using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using KhalifaWearStore.Domain.DbInitializer;

namespace KhalifaWearStore.Persistence.Extensions
{
    public static class DbInitializerExtension
    {
        public static async Task SeedDatabaseAsync(this IApplicationBuilder app)
        {
            using var scope = app.ApplicationServices.CreateScope();
            var services = scope.ServiceProvider;
            try
            {
                var initializer = services.GetRequiredService<IDbInitializer>();
                await initializer.DataSeedAsync();
            }
            catch (Exception ex)
            {
                var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("DbInitializer");
                logger.LogError(ex, "An error occurred while migrating or seeding the Khalifa Wear Store database.");
            }
        }
    }
}
