using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using KhalifaWearStore.Persistence.KhalifaWearStoreDbContext;

namespace KhalifaWearStore.Persistence.ProgramService
{
    public static class AddDbService
    {
        public static IServiceCollection InjectDatabaseService(
            this IServiceCollection services,
            IConfiguration configuration)
        {
            services.AddDbContext<KhalifaDbContext>(options =>
                options.UseSqlServer(configuration.GetConnectionString("DefaultConnection")));

            return services;
        }
    }
}
