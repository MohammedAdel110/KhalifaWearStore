using Microsoft.AspNetCore.SignalR;
using KhalifaWearStore.Abstraction.IServices.Order;
using KhalifaWearStore.Shared.DTOs.Order;

namespace KhalifaWearStore.Web.Hubs
{
    public class SignalROrderNotificationService(
        IHubContext<OrderNotificationHub> hubContext) : IOrderNotificationService
    {
        public async Task NotifyNewOrderAsync(OrderDetailsDto order)
        {
            await hubContext.Clients
                .Group(OrderNotificationHub.AdminsGroupName)
                .SendAsync("NewOrderReceived", order);
        }

        public async Task NotifyOrderPaymentUpdatedAsync(OrderDetailsDto order)
        {
            await hubContext.Clients
                .Group(OrderNotificationHub.AdminsGroupName)
                .SendAsync("OrderPaymentUpdated", order);
        }
    }
}
