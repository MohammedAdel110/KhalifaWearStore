using AutoMapper;
using KhalifaWearStore.Domain.Models.Orders;
using KhalifaWearStore.Services.Resolver;
using KhalifaWearStore.Shared.DTOs.Order;
using KhalifaWearStore.Shared.DTOs.OrderDetail;
using KhalifaWearStore.Shared.DTOs.Payment;

namespace KhalifaWearStore.Services.AutoMapper.OrderMapping
{
    public class OrderMappingProfile : Profile
    {
        public OrderMappingProfile()
        {
            // Payment Mappings
            CreateMap<Payment, PaymentDto>();
            CreateMap<CreatePaymentDto, Payment>();

            // OrderDetail Mappings
            CreateMap<OrderDetail, OrderDetailItemDto>()
                .ForMember(dest => dest.ProductName, opt => opt.MapFrom(src => src.Product != null ? src.Product.ProductName : string.Empty))
                .ForMember(dest => dest.ProductImage, opt => opt.MapFrom<PictureResolver<OrderDetail, OrderDetailItemDto>, string>(src => src.Product != null && src.Product.Image != null ? src.Product.Image : string.Empty));

            // Order Summary Mappings
            CreateMap<Order, OrderDto>()
                .ForMember(dest => dest.CustomerName, opt => opt.MapFrom(src => src.Customer != null ? $"{src.Customer.FirstName} {src.Customer.LastName}".Trim() : string.Empty))
                .ForMember(dest => dest.CustomerEmail, opt => opt.MapFrom(src => src.Customer != null ? src.Customer.Email : string.Empty))
                .ForMember(dest => dest.CustomerPhoneNo, opt => opt.MapFrom(src => !string.IsNullOrEmpty(src.ShippingPhoneNo) ? src.ShippingPhoneNo : (src.Customer != null ? src.Customer.PhoneNo : string.Empty)))
                .ForMember(dest => dest.CustomerCity, opt => opt.MapFrom(src => !string.IsNullOrEmpty(src.ShippingCity) ? src.ShippingCity : (src.Customer != null ? src.Customer.City : string.Empty)))
                .ForMember(dest => dest.ShippingAddress, opt => opt.MapFrom(src => !string.IsNullOrEmpty(src.ShippingAddress) ? src.ShippingAddress : (src.Customer != null ? src.Customer.Address : string.Empty)))
                .ForMember(dest => dest.PaymentType, opt => opt.MapFrom(src => src.Payment != null ? src.Payment.PaymentType.ToString() : string.Empty))
                .ForMember(dest => dest.OrderStatus, opt => opt.MapFrom(src => !string.IsNullOrWhiteSpace(src.OrderStatus) ? src.OrderStatus : "Pending"))
                .ForMember(dest => dest.Subtotal, opt => opt.MapFrom(src => src.OrderDetails != null ? src.OrderDetails.Sum(d => d.Total) : 0m))
                .ForMember(dest => dest.OrderTotal, opt => opt.MapFrom(src =>
                    Math.Max(0m, (src.OrderDetails != null ? src.OrderDetails.Sum(d => d.Total) : 0m) - src.DiscountAmount + src.ShippingFee)))
                .ForMember(dest => dest.TotalItemsCount, opt => opt.MapFrom(src => src.OrderDetails != null ? src.OrderDetails.Sum(d => d.Quantity) : 0));

            // Order Details Mappings
            CreateMap<Order, OrderDetailsDto>()
                .ForMember(dest => dest.CustomerName, opt => opt.MapFrom(src => src.Customer != null ? $"{src.Customer.FirstName} {src.Customer.LastName}".Trim() : string.Empty))
                .ForMember(dest => dest.CustomerEmail, opt => opt.MapFrom(src => src.Customer != null ? src.Customer.Email : string.Empty))
                .ForMember(dest => dest.CustomerPhoneNo, opt => opt.MapFrom(src => !string.IsNullOrEmpty(src.ShippingPhoneNo) ? src.ShippingPhoneNo : (src.Customer != null ? src.Customer.PhoneNo : string.Empty)))
                .ForMember(dest => dest.CustomerCity, opt => opt.MapFrom(src => !string.IsNullOrEmpty(src.ShippingCity) ? src.ShippingCity : (src.Customer != null ? src.Customer.City : string.Empty)))
                .ForMember(dest => dest.ShippingAddress, opt => opt.MapFrom(src => !string.IsNullOrEmpty(src.ShippingAddress) ? src.ShippingAddress : (src.Customer != null ? src.Customer.Address : string.Empty)))
                .ForMember(dest => dest.CustomerPostcode, opt => opt.MapFrom(src => src.Customer != null ? src.Customer.Postcode : string.Empty))
                .ForMember(dest => dest.PaymentType, opt => opt.MapFrom(src => src.Payment != null ? src.Payment.PaymentType.ToString() : string.Empty))
                .ForMember(dest => dest.OrderStatus, opt => opt.MapFrom(src => !string.IsNullOrWhiteSpace(src.OrderStatus) ? src.OrderStatus : "Pending"))
                .ForMember(dest => dest.Subtotal, opt => opt.MapFrom(src => src.OrderDetails != null ? src.OrderDetails.Sum(d => d.Total) : 0m))
                .ForMember(dest => dest.OrderTotal, opt => opt.MapFrom(src =>
                    Math.Max(0m, (src.OrderDetails != null ? src.OrderDetails.Sum(d => d.Total) : 0m) - src.DiscountAmount + src.ShippingFee)))
                .ForMember(dest => dest.Items, opt => opt.MapFrom(src => src.OrderDetails));
        }
    }
}
