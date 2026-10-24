using KhalifaWearStore.Shared.Common.Pagination;
using KhalifaWearStore.Shared.Common.Params.Order;
using KhalifaWearStore.Shared.DTOs.Order;

namespace KhalifaWearStore.Abstraction.IServices.Order
{
    public interface IOrderService
    {
        // Customer Operations
        Task<OrderDetailsDto> CreateOrderAsync(CreateOrderDto createDto, string applicationUserId);
        Task<PaginationResponse<OrderDto>> GetMyOrdersAsync(string applicationUserId, OrderQueryParams queryParams);
        Task<OrderDetailsDto> GetMyOrderDetailsAsync(int orderId, string applicationUserId);
        Task<OrderDetailsDto> TrackOrderPublicAsync(int orderId, string phoneNo);

        // Admin Operations
        Task<PaginationResponse<OrderDto>> GetAllOrdersAsync(OrderQueryParams queryParams);
        Task<OrderDetailsDto> GetAdminOrderDetailsAsync(int orderId);
        Task<OrderDetailsDto> UpdateOrderPaymentStatusAsync(int orderId, UpdateOrderPaymentStatusDto updateDto);
        Task<OrderDetailsDto> UpdateOrderStatusAsync(int orderId, UpdateOrderStatusDto updateDto);

        // Promo Code Operations
        Task<IReadOnlyList<PromoCodeDto>> GetActivePromoCodesAsync();
        Task<IReadOnlyList<PromoCodeDto>> GetAllPromoCodesAdminAsync();
        Task<PromoCodeDto> CreatePromoCodeAsync(CreatePromoCodeDto createDto);
        Task<PromoCodeDto> TogglePromoCodeAsync(int id);
        Task<PromoCodeDto> FeaturePromoCodeOnBannerAsync(int id);
        Task<bool> DeletePromoCodeAsync(int id);
    }
}
