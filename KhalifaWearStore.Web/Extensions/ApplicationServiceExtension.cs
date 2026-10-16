using KhalifaWearStore.Abstraction.IServices.Attachment;
using KhalifaWearStore.Abstraction.IServices.Auth;
using KhalifaWearStore.Abstraction.IServices.Category;
using KhalifaWearStore.Abstraction.IServices.Customer;
using KhalifaWearStore.Abstraction.IServices.Order;
using KhalifaWearStore.Abstraction.IServices.Payment;
using KhalifaWearStore.Abstraction.IServices.Product;
using KhalifaWearStore.Abstraction.IServices.Stock;
using KhalifaWearStore.Abstraction.IServices.Token;
using KhalifaWearStore.Domain.Contracts.UnitOfWorkPattern;
using KhalifaWearStore.Domain.DbInitializer;
using KhalifaWearStore.Persistence.Implementations.InitializerImplement;
using KhalifaWearStore.Persistence.Implementations.UoWPattern;
using KhalifaWearStore.Services.Resolver;
using KhalifaWearStore.Services.ServicesImplementation.Attachment;
using KhalifaWearStore.Services.ServicesImplementation.Auth;
using KhalifaWearStore.Services.ServicesImplementation.Category;
using KhalifaWearStore.Services.ServicesImplementation.Customer;
using KhalifaWearStore.Services.ServicesImplementation.Order;
using KhalifaWearStore.Services.ServicesImplementation.Payment;
using KhalifaWearStore.Services.ServicesImplementation.Product;
using KhalifaWearStore.Services.ServicesImplementation.Stock;
using KhalifaWearStore.Services.ServicesImplementation.Token;

namespace KhalifaWearStore.Web.Extensions
{
    public static class ApplicationServiceExtension
    {
        public static IServiceCollection AddApplicationService(this IServiceCollection services)
        {
            services.AddHttpContextAccessor();

            // 1. Core & Infrastructure (Unit of Work & Seeder)
            services.AddScoped<IUnitOfWork, UnitOfWork>();
            services.AddScoped<IDbInitializer, DbInitialized>();

            // 2. Application Services
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<ITokenService, TokenService>();
            services.AddScoped<IAttachmentService, AttachmentService>();
            services.AddScoped<ICategoryService, CategoryService>();
            services.AddScoped<IProductService, ProductService>();
            services.AddScoped<IStockService, StockService>();
            services.AddScoped<ICustomerService, CustomerService>();
            services.AddScoped<IPaymentService, PaymentService>();
            services.AddScoped<IOrderService, OrderService>();

            // 3. Helpers & Resolvers
            services.AddScoped(typeof(PictureResolver<,>));

            // 4. MediatR Registration
            services.AddMediatR(cfg =>
            {
                cfg.RegisterServicesFromAssembly(typeof(PictureResolver<,>).Assembly);
            });

            return services;
        }
    }
}
