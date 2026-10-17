using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace KhalifaWearStore.Web.Hubs
{
    [Authorize(Roles = "Admin,Owner")]
    public class OrderNotificationHub : Hub
    {
        public const string AdminsGroupName = "Admins";

        public override async Task OnConnectedAsync()
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, AdminsGroupName);
            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, AdminsGroupName);
            await base.OnDisconnectedAsync(exception);
        }
    }
}
