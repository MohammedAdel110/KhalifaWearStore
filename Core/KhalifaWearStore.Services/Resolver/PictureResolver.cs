using AutoMapper;
using Microsoft.Extensions.Configuration;

namespace KhalifaWearStore.Services.Resolver
{
    public class PictureResolver<TSource, TDestination>(IConfiguration configuration)
        : IMemberValueResolver<TSource, TDestination, string?, string?>
    {
        public string? Resolve(TSource source, TDestination destination, string? sourceMember, string? destMember, ResolutionContext context)
        {
            if (string.IsNullOrEmpty(sourceMember))
                return string.Empty;

            var baseUrl = configuration["ApiBaseUrl"];
            return $"{baseUrl}/{sourceMember.TrimStart('/')}";
        }
    }
}
