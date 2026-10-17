using KhalifaWearStore.Shared.DTOs.Order;

namespace KhalifaWearStore.Abstraction.IServices.Order
{
    public interface IOrderNotificationService
    {
        Task NotifyNewOrderAsync(OrderDetailsDto order);
        Task NotifyOrderPaymentUpdatedAsync(OrderDetailsDto order);
    }
}
