using AutoMapper;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace KhalifaWearStore.Services.Resolver
{
    public class PictureResolver<TSource, TDestination>(
        IConfiguration configuration,
        IHttpContextAccessor httpContextAccessor)
        : IMemberValueResolver<TSource, TDestination, string?, string?>
    {
        public string? Resolve(TSource source, TDestination destination, string? sourceMember, string? destMember, ResolutionContext context)
        {
            if (string.IsNullOrWhiteSpace(sourceMember))
                return null;

            var trimmed = sourceMember.Trim();
            if (trimmed.StartsWith("data:", StringComparison.OrdinalIgnoreCase) ||
                trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                return trimmed;
            }

            var req = httpContextAccessor.HttpContext?.Request;
            string baseUrl;
            if (req != null && req.Host.HasValue)
            {
                if (req.Host.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase))
                {
                    var host = req.Host.Value.Equals("localhost:5050", StringComparison.OrdinalIgnoreCase)
                        ? "localhost:7050"
                        : req.Host.Value;
                    baseUrl = $"https://{host}";
                }
                else
                {
                    var forwardedProto = req.Headers["X-Forwarded-Proto"].FirstOrDefault();
                    var scheme = !string.IsNullOrEmpty(forwardedProto) ? forwardedProto : req.Scheme;
                    baseUrl = $"{scheme}://{req.Host}";
                }
            }
            else
            {
                baseUrl = (configuration["ApiBaseUrl"] ?? "https://localhost:7050").TrimEnd('/');
            }

            return $"{baseUrl}/{trimmed.TrimStart('/')}";
        }
    }
}
