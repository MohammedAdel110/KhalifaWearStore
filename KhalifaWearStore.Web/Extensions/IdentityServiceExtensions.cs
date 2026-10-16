using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using KhalifaWearStore.Domain.Models.User;
using KhalifaWearStore.Persistence.KhalifaWearStoreDbContext;

namespace KhalifaWearStore.Web.Extensions
{
    public static class IdentityServiceExtensions
    {
        public static IServiceCollection InjectIdentityCore(this IServiceCollection services)
        {
            services.AddIdentityCore<ApplicationUser>(options =>
            {
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireNonAlphanumeric = true;
                options.Password.RequireUppercase = true;
                options.Password.RequiredLength = 6;
                options.Tokens.PasswordResetTokenProvider = TokenOptions.DefaultEmailProvider;
            })
                .AddRoles<IdentityRole>()
                .AddEntityFrameworkStores<KhalifaDbContext>()
                .AddDefaultTokenProviders();

            return services;
        }

        public static IServiceCollection InjectRateLimiting(this IServiceCollection services)
        {
            services.AddRateLimiter(options =>
            {
                options.AddFixedWindowLimiter("OtpPolicy", opt =>
                {
                    opt.Window = TimeSpan.FromMinutes(2);
                    opt.PermitLimit = 3;
                    opt.QueueLimit = 0;
                });
                options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            });
            return services;
        }
    }
}
