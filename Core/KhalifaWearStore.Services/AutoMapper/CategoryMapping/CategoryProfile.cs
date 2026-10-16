using AutoMapper;
using KhalifaWearStore.Domain.Models.Catalog;
using KhalifaWearStore.Shared.DTOs.Category;

namespace KhalifaWearStore.Services.AutoMapper.CategoryMapping
{
    public class CategoryProfile : Profile
    {
        public CategoryProfile()
        {
            CreateMap<Category, CategoryDto>()
                .ForMember(dest => dest.ProductsCount, opt => opt.MapFrom(src => src.Products != null ? src.Products.Count : 0));

            CreateMap<Category, CategoryDetailsDto>();

            CreateMap<CreateCategoryDto, Category>();
            CreateMap<UpdateCategoryDto, Category>();
        }
    }
}
