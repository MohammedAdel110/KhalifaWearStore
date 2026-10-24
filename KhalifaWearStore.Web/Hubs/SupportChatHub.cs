using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace KhalifaWearStore.Web.Hubs
{
    public class SupportChatHub : Hub
    {
        public const string SupportAdminsGroup = "SupportAdmins";
        private const int MaxMessageLength = 2000;
        private readonly SupportChatStore _chatStore;

        public SupportChatHub(SupportChatStore chatStore)
        {
            _chatStore = chatStore;
        }

        private static string GetCustomerThreadGroup(string threadId) => $"thread:{threadId.Trim().ToLowerInvariant()}";

        private bool IsCallerAdminOrOwner() =>
            Context.User?.IsInRole("Admin") == true || Context.User?.IsInRole("Owner") == true;

        public async Task JoinCustomerThread(string threadId, string customerName, string? customerEmail)
        {
            if (string.IsNullOrWhiteSpace(threadId))
                return;

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

        [Authorize(Roles = "Admin,Owner")]
        public async Task JoinAdminConsole()
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, SupportAdminsGroup);
            var allThreads = _chatStore.GetAllThreads();
            await Clients.Caller.SendAsync("AllThreadsSnapshot", allThreads);
        }

        public async Task SendCustomerMessage(string threadId, string customerName, string? customerEmail, string text)
        {
            if (string.IsNullOrWhiteSpace(threadId) || string.IsNullOrWhiteSpace(text))
                return;

            var cleanText = text.Trim();
            if (cleanText.Length > MaxMessageLength)
                cleanText = cleanText[..MaxMessageLength];

            var (message, thread) = _chatStore.AddCustomerMessage(threadId, customerName, customerEmail, cleanText);
            var groupName = GetCustomerThreadGroup(thread.ThreadId);

            await Clients.Group(groupName).SendAsync("ReceiveChatMessage", message);
            await Clients.Group(SupportAdminsGroup).SendAsync("ReceiveChatMessage", message);
            await Clients.Group(SupportAdminsGroup).SendAsync("ThreadUpdated", thread);
            await Clients.Group(groupName).SendAsync("ThreadUpdated", thread);
        }

        [Authorize(Roles = "Admin,Owner")]
        public async Task SendAdminReply(string threadId, string adminName, string text)
        {
            if (string.IsNullOrWhiteSpace(threadId) || string.IsNullOrWhiteSpace(text))
                return;

            var cleanText = text.Trim();
            if (cleanText.Length > MaxMessageLength)
                cleanText = cleanText[..MaxMessageLength];

            var result = _chatStore.AddAdminMessage(threadId, adminName, cleanText);
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
            if (string.IsNullOrWhiteSpace(threadId))
                return;

            if (string.Equals(readerRole, "Admin", StringComparison.OrdinalIgnoreCase) && !IsCallerAdminOrOwner())
                return;

            var updated = _chatStore.MarkThreadRead(threadId, readerRole);
            if (updated == null)
                return;

            var groupName = GetCustomerThreadGroup(updated.ThreadId);
            await Clients.Group(SupportAdminsGroup).SendAsync("ThreadUpdated", updated);
            await Clients.Group(groupName).SendAsync("ThreadUpdated", updated);
        }

        public async Task SendTypingIndicator(string threadId, string senderRole, string senderName, bool isTyping)
        {
            if (string.IsNullOrWhiteSpace(threadId))
                return;

            if (string.Equals(senderRole, "Admin", StringComparison.OrdinalIgnoreCase) && !IsCallerAdminOrOwner())
                return;

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
