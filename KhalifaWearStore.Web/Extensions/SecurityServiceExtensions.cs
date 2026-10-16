using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace KhalifaWearStore.Web.Extensions
{
    public static class SecurityServiceExtensions
    {
        public static IServiceCollection AddCustomCors(this IServiceCollection services, IConfiguration config)
        {
            var allowedOrigins = config.GetSection("AllowedOrigins")
                .Get<string[]>() ?? Array.Empty<string>();

            services.AddCors(options =>
            {
                options.AddPolicy("CorsPolicy", policy =>
                {
                    policy.AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials()
                          .WithOrigins(allowedOrigins);
                });
            });

            return services;
        }

        public static IServiceCollection AddJwtAuthentication(
            this IServiceCollection services,
            IConfiguration config,
            IWebHostEnvironment env)
        {
            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            }).AddJwtBearer(options =>
            {
                options.SaveToken = false;
                options.RequireHttpsMetadata = env.IsProduction();

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = config["JwtTokenSettings:Issuer"],

                    ValidateAudience = true,
                    ValidAudience = config["JwtTokenSettings:Audience"],

                    ValidateLifetime = true,

                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(config["JwtTokenSettings:SecretKey"] ?? string.Empty)),
                    ClockSkew = TimeSpan.Zero
                };
            });

            return services;
        }
    }
}
