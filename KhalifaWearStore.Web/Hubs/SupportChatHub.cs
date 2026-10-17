using Microsoft.AspNetCore.SignalR;

namespace KhalifaWearStore.Web.Hubs
{
    public class SupportChatHub : Hub
    {
        public const string SupportAdminsGroup = "SupportAdmins";
        private readonly SupportChatStore _chatStore;

        public SupportChatHub(SupportChatStore chatStore)
        {
            _chatStore = chatStore;
        }

        private static string GetCustomerThreadGroup(string threadId) => $"thread:{threadId.Trim().ToLowerInvariant()}";

        public async Task JoinCustomerThread(string threadId, string customerName, string? customerEmail)
        {
            var thread = _chatStore.RegisterCustomerConnection(
                Context.ConnectionId,
                threadId,
                customerName,
                customerEmail);

            var groupName = GetCustomerThreadGroup(thread.ThreadId);
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);

            await Clients.Caller.SendAsync("ThreadHistory", thread);
            await Clients.Group(SupportAdminsGroup).SendAsync("ThreadUpdated", thread);
        }

        public async Task JoinAdminConsole()
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, SupportAdminsGroup);
            var allThreads = _chatStore.GetAllThreads();
            await Clients.Caller.SendAsync("AllThreadsSnapshot", allThreads);
        }

        public async Task SendCustomerMessage(string threadId, string customerName, string? customerEmail, string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return;

            var (message, thread) = _chatStore.AddCustomerMessage(threadId, customerName, customerEmail, text);
            var groupName = GetCustomerThreadGroup(thread.ThreadId);

            await Clients.Group(groupName).SendAsync("ReceiveChatMessage", message);
            await Clients.Group(SupportAdminsGroup).SendAsync("ReceiveChatMessage", message);
            await Clients.Group(SupportAdminsGroup).SendAsync("ThreadUpdated", thread);
            await Clients.Group(groupName).SendAsync("ThreadUpdated", thread);
        }

        public async Task SendAdminReply(string threadId, string adminName, string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return;

            var result = _chatStore.AddAdminMessage(threadId, adminName, text);
            if (result == null)
                return;

            var (message, thread) = result.Value;
            var groupName = GetCustomerThreadGroup(thread.ThreadId);

            await Clients.Group(groupName).SendAsync("ReceiveChatMessage", message);
            await Clients.Group(SupportAdminsGroup).SendAsync("ReceiveChatMessage", message);
            await Clients.Group(SupportAdminsGroup).SendAsync("ThreadUpdated", thread);
            await Clients.Group(groupName).SendAsync("ThreadUpdated", thread);
        }

        public async Task MarkThreadRead(string threadId, string readerRole)
        {
            var updated = _chatStore.MarkThreadRead(threadId, readerRole);
            if (updated == null)
                return;

            var groupName = GetCustomerThreadGroup(updated.ThreadId);
            await Clients.Group(SupportAdminsGroup).SendAsync("ThreadUpdated", updated);
            await Clients.Group(groupName).SendAsync("ThreadUpdated", updated);
        }

        public async Task SendTypingIndicator(string threadId, string senderRole, string senderName, bool isTyping)
        {
            var groupName = GetCustomerThreadGroup(threadId);
            var payload = new
            {
                threadId = threadId.Trim(),
                senderRole,
                senderName,
                isTyping
            };

            if (string.Equals(senderRole, "Admin", StringComparison.OrdinalIgnoreCase))
            {
                await Clients.Group(groupName).SendAsync("UserTyping", payload);
            }
            else
            {
                await Clients.Group(SupportAdminsGroup).SendAsync("UserTyping", payload);
            }
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var updatedThread = _chatStore.UnregisterConnection(Context.ConnectionId);
            if (updatedThread != null)
            {
                await Clients.Group(SupportAdminsGroup).SendAsync("ThreadUpdated", updatedThread);
            }
            await base.OnDisconnectedAsync(exception);
        }
    }
}
