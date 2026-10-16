using AutoMapper;
using KhalifaWearStore.Domain.Models.Catalog;
using KhalifaWearStore.Shared.DTOs.Stock;

namespace KhalifaWearStore.Services.AutoMapper.StockMapping
{
    public class StockProfile : Profile
    {
        public StockProfile()
        {
            CreateMap<Stock, StockDto>()
                .ForMember(dest => dest.ProductName, opt => opt.MapFrom(src => src.Product != null ? src.Product.ProductName : string.Empty));

            CreateMap<CreateStockDto, Stock>();
            CreateMap<UpdateStockDto, Stock>();
        }
    }
}
