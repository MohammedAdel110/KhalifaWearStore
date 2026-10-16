using AutoMapper;
using KhalifaWearStore.Domain.Models.Catalog;
using KhalifaWearStore.Services.Resolver;
using KhalifaWearStore.Shared.DTOs.Product;

namespace KhalifaWearStore.Services.AutoMapper.ProductMapping
{
    public class ProductProfile : Profile
    {
        public ProductProfile()
        {
            CreateMap<Product, ProductDto>()
                .ForMember(dest => dest.CategoryName, opt => opt.MapFrom(src => src.Category != null ? src.Category.CategoryName : string.Empty))
                .ForMember(dest => dest.Image, opt => opt.MapFrom<PictureResolver<Product, ProductDto>, string>(src => src.Image ?? string.Empty));

            CreateMap<Product, ProductDetailsDto>()
                .ForMember(dest => dest.CategoryName, opt => opt.MapFrom(src => src.Category != null ? src.Category.CategoryName : string.Empty))
                .ForMember(dest => dest.Image, opt => opt.MapFrom<PictureResolver<Product, ProductDetailsDto>, string>(src => src.Image ?? string.Empty));

            CreateMap<CreateProductDto, Product>()
                .ForMember(dest => dest.Image, opt => opt.Ignore());

            CreateMap<UpdateProductDto, Product>()
                .ForMember(dest => dest.Image, opt => opt.Ignore());
        }
    }
}
