using Microsoft.Extensions.DependencyInjection;
using KhalifaWearStore.Services.AutoMapper.AuthMapping;
using KhalifaWearStore.Services.AutoMapper.CategoryMapping;
using KhalifaWearStore.Services.AutoMapper.CustomerMapping;
using KhalifaWearStore.Services.AutoMapper.OrderMapping;
using KhalifaWearStore.Services.AutoMapper.ProductMapping;
using KhalifaWearStore.Services.AutoMapper.StockMapping;

namespace KhalifaWearStore.Services.AutoMapper
{
    public static class AutoMapperService
    {
        public static IServiceCollection InjectAutoMapperService(this IServiceCollection services)
        {
            services.AddAutoMapper(cfg =>
            {
                cfg.AddProfile(new AuthProfile());
                cfg.AddProfile(new CategoryProfile());
                cfg.AddProfile(new ProductProfile());
                cfg.AddProfile(new StockProfile());
                cfg.AddProfile(new CustomerProfile());
                cfg.AddProfile(new OrderMappingProfile());
            });
            return services;
        }
    }
}
