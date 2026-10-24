using AutoMapper;
using KhalifaWearStore.Domain.Models.Catalog;
using KhalifaWearStore.Services.Resolver;
using KhalifaWearStore.Shared.DTOs.Category;

namespace KhalifaWearStore.Services.AutoMapper.CategoryMapping
{
    public class CategoryProfile : Profile
    {
        public CategoryProfile()
        {
            CreateMap<Category, CategoryDto>()
                .ForMember(dest => dest.ProductsCount, opt => opt.MapFrom(src => src.Products != null ? src.Products.Count(p => !p.IsDeleted) : 0))
                .ForMember(dest => dest.Image, opt => opt.MapFrom<PictureResolver<Category, CategoryDto>, string?>(src => src.Image));

            CreateMap<Category, CategoryDetailsDto>()
                .ForMember(dest => dest.Image, opt => opt.MapFrom<PictureResolver<Category, CategoryDetailsDto>, string?>(src => src.Image));

            CreateMap<CreateCategoryDto, Category>()
                .ForMember(dest => dest.Image, opt => opt.Ignore());

            CreateMap<UpdateCategoryDto, Category>()
                .ForMember(dest => dest.Image, opt => opt.Ignore());
        }
    }
}
