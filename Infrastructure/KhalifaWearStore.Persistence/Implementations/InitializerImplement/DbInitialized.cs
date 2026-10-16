using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using KhalifaWearStore.Domain.DbInitializer;
using KhalifaWearStore.Domain.Models.User;
using KhalifaWearStore.Persistence.KhalifaWearStoreDbContext;
using KhalifaWearStore.Persistence.Seeds;

namespace KhalifaWearStore.Persistence.Implementations.InitializerImplement
{
    public class DbInitialized(
        KhalifaDbContext projectDbContext,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IConfiguration configuration) : IDbInitializer
    {
        public async Task DataSeedAsync()
        {
            var pendingMigrations = await projectDbContext.Database.GetPendingMigrationsAsync();
            if (pendingMigrations != null && pendingMigrations.Any())
            {
                await projectDbContext.Database.MigrateAsync();
            }

            await SeederAsync.SeedRolesAsync(roleManager);
            await SeederAsync.SeedAdminUserAsync(userManager);

            var enableDemoData = configuration.GetValue<bool>("Seeding:EnableDemoData", true);
            if (enableDemoData)
            {
                await SeederAsync.SeedDummyCustomersAsync(userManager);
                await SeederAsync.SeedStoreDataAsync(projectDbContext);
            }
        }
    }
}
