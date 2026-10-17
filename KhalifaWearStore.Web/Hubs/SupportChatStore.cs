using System.Collections.Concurrent;
using System.Text.Json;
using KhalifaWearStore.Shared.DTOs.Chat;

namespace KhalifaWearStore.Web.Hubs
{
    public class SupportChatStore
    {
        private readonly ConcurrentDictionary<string, ChatThreadSummaryDto> _threads = new(StringComparer.OrdinalIgnoreCase);
        private readonly ConcurrentDictionary<string, HashSet<string>> _threadConnections = new(StringComparer.OrdinalIgnoreCase);
        private readonly ConcurrentDictionary<string, string> _connectionToThread = new();
        private readonly object _fileLock = new();
        private readonly string _storageFilePath;

        public SupportChatStore(IWebHostEnvironment env)
        {
            var dataDir = Path.Combine(env.ContentRootPath, "App_Data");
            Directory.CreateDirectory(dataDir);
            _storageFilePath = Path.Combine(dataDir, "support_chats.json");
            LoadFromDisk();
        }

        private void LoadFromDisk()
        {
            try
            {
                if (!File.Exists(_storageFilePath))
                    return;

                var json = File.ReadAllText(_storageFilePath);
                var saved = JsonSerializer.Deserialize<List<ChatThreadSummaryDto>>(json);
                if (saved == null)
                    return;

                foreach (var thread in saved)
                {
                    if (!string.IsNullOrWhiteSpace(thread.ThreadId))
                    {
                        thread.IsCustomerOnline = false;
                        _threads[thread.ThreadId] = thread;
                    }
                }
            }
            catch
            {
                // Ignore corrupted cache file on startup
            }
        }

        private void SaveToDisk()
        {
            lock (_fileLock)
            {
                try
                {
                    var snapshot = _threads.Values
                        .OrderByDescending(t => t.LastMessageAt)
                        .ToList();
                    var json = JsonSerializer.Serialize(snapshot, new JsonSerializerOptions
                    {
                        WriteIndented = true
                    });
                    File.WriteAllText(_storageFilePath, json);
                }
                catch
                {
                    // Ignore disk write contention
                }
            }
        }

        public ChatThreadSummaryDto RegisterCustomerConnection(
            string connectionId,
            string threadId,
            string customerName,
            string? customerEmail)
        {
            var normalizedThreadId = string.IsNullOrWhiteSpace(threadId)
                ? $"guest:{Guid.NewGuid():N}"
                : threadId.Trim();

            _connectionToThread[connectionId] = normalizedThreadId;

            var connections = _threadConnections.GetOrAdd(normalizedThreadId, _ => new HashSet<string>());
            lock (connections)
            {
                connections.Add(connectionId);
            }

            var thread = _threads.GetOrAdd(normalizedThreadId, id => new ChatThreadSummaryDto
            {
                ThreadId = id,
                CustomerName = string.IsNullOrWhiteSpace(customerName) ? "KF Guest" : customerName.Trim(),
                CustomerEmail = string.IsNullOrWhiteSpace(customerEmail) ? null : customerEmail.Trim(),
                LastMessageText = "Conversation started",
                LastMessageAt = DateTime.UtcNow,
                IsCustomerOnline = true,
                Messages = new List<ChatMessageDto>
                {
                    new ChatMessageDto
                    {
                        Id = Guid.NewGuid().ToString("N"),
                        ThreadId = id,
                        SenderRole = "Admin",
                        SenderName = "KHALIFA SUPPORT",
                        Text = "Welcome to KHALIFA Support. How can we help you with your order, sizing, or drop inquiry today?",
                        SentAt = DateTime.UtcNow,
                        IsReadByAdmin = true,
                        IsReadByCustomer = true
                    }
                }
            });

            lock (thread)
            {
                if (!string.IsNullOrWhiteSpace(customerName))
                    thread.CustomerName = customerName.Trim();
                if (!string.IsNullOrWhiteSpace(customerEmail))
                    thread.CustomerEmail = customerEmail.Trim();

                thread.IsCustomerOnline = true;
                RecalculateUnreadCounts(thread);
            }

            SaveToDisk();
            return CloneThread(thread);
        }

        public ChatThreadSummaryDto? UnregisterConnection(string connectionId)
        {
            if (!_connectionToThread.TryRemove(connectionId, out var threadId))
                return null;

            bool stillOnline = false;
            if (_threadConnections.TryGetValue(threadId, out var connections))
            {
                lock (connections)
                {
                    connections.Remove(connectionId);
                    stillOnline = connections.Count > 0;
                }
            }

            if (_threads.TryGetValue(threadId, out var thread))
            {
                lock (thread)
                {
                    thread.IsCustomerOnline = stillOnline;
                }
                return CloneThread(thread);
            }

            return null;
        }

        public (ChatMessageDto Message, ChatThreadSummaryDto Thread) AddCustomerMessage(
            string threadId,
            string customerName,
            string? customerEmail,
            string text)
        {
            var normalizedThreadId = threadId.Trim();
            var thread = _threads.GetOrAdd(normalizedThreadId, id => new ChatThreadSummaryDto
            {
                ThreadId = id,
                CustomerName = string.IsNullOrWhiteSpace(customerName) ? "KF Guest" : customerName.Trim(),
                CustomerEmail = string.IsNullOrWhiteSpace(customerEmail) ? null : customerEmail.Trim(),
                LastMessageAt = DateTime.UtcNow,
                IsCustomerOnline = true
            });

            ChatMessageDto message;
            lock (thread)
            {
                if (!string.IsNullOrWhiteSpace(customerName))
                    thread.CustomerName = customerName.Trim();
                if (!string.IsNullOrWhiteSpace(customerEmail))
                    thread.CustomerEmail = customerEmail.Trim();

                message = new ChatMessageDto
                {
                    Id = Guid.NewGuid().ToString("N"),
                    ThreadId = normalizedThreadId,
                    SenderRole = "Customer",
                    SenderName = thread.CustomerName,
                    SenderEmail = thread.CustomerEmail,
                    Text = text.Trim(),
                    SentAt = DateTime.UtcNow,
                    IsReadByAdmin = false,
                    IsReadByCustomer = true
                };

                thread.Messages.Add(message);
                thread.LastMessageText = message.Text;
                thread.LastMessageAt = message.SentAt;
                thread.IsCustomerOnline = true;
                RecalculateUnreadCounts(thread);
            }

            SaveToDisk();
            return (message, CloneThread(thread));
        }

        public (ChatMessageDto Message, ChatThreadSummaryDto Thread)? AddAdminMessage(
            string threadId,
            string adminName,
            string text)
        {
            if (!_threads.TryGetValue(threadId.Trim(), out var thread))
                return null;

            ChatMessageDto message;
            lock (thread)
            {
                foreach (var msg in thread.Messages)
                {
                    if (msg.SenderRole == "Customer")
                        msg.IsReadByAdmin = true;
                }

                message = new ChatMessageDto
                {
                    Id = Guid.NewGuid().ToString("N"),
                    ThreadId = thread.ThreadId,
                    SenderRole = "Admin",
                    SenderName = string.IsNullOrWhiteSpace(adminName) ? "KHALIFA ADMIN" : adminName.Trim(),
                    Text = text.Trim(),
                    SentAt = DateTime.UtcNow,
                    IsReadByAdmin = true,
                    IsReadByCustomer = false
                };

                thread.Messages.Add(message);
                thread.LastMessageText = message.Text;
                thread.LastMessageAt = message.SentAt;
                RecalculateUnreadCounts(thread);
            }

            SaveToDisk();
            return (message, CloneThread(thread));
        }

        public ChatThreadSummaryDto? MarkThreadRead(string threadId, string readerRole)
        {
            if (!_threads.TryGetValue(threadId.Trim(), out var thread))
                return null;

            lock (thread)
            {
                var isAdmin = string.Equals(readerRole, "Admin", StringComparison.OrdinalIgnoreCase);
                foreach (var msg in thread.Messages)
                {
                    if (isAdmin && msg.SenderRole == "Customer")
                        msg.IsReadByAdmin = true;
                    else if (!isAdmin && msg.SenderRole == "Admin")
                        msg.IsReadByCustomer = true;
                }
                RecalculateUnreadCounts(thread);
            }

            SaveToDisk();
            return CloneThread(thread);
        }

        public List<ChatThreadSummaryDto> GetAllThreads()
        {
            return _threads.Values
                .Select(CloneThread)
                .OrderByDescending(t => t.LastMessageAt)
                .ToList();
        }

        private static void RecalculateUnreadCounts(ChatThreadSummaryDto thread)
        {
            thread.UnreadForAdminCount = thread.Messages.Count(m => m.SenderRole == "Customer" && !m.IsReadByAdmin);
            thread.UnreadForCustomerCount = thread.Messages.Count(m => m.SenderRole == "Admin" && !m.IsReadByCustomer);
        }

        private static ChatThreadSummaryDto CloneThread(ChatThreadSummaryDto source)
        {
            lock (source)
            {
                return new ChatThreadSummaryDto
                {
                    ThreadId = source.ThreadId,
                    CustomerName = source.CustomerName,
                    CustomerEmail = source.CustomerEmail,
                    LastMessageText = source.LastMessageText,
                    LastMessageAt = source.LastMessageAt,
                    UnreadForAdminCount = source.UnreadForAdminCount,
                    UnreadForCustomerCount = source.UnreadForCustomerCount,
                    IsCustomerOnline = source.IsCustomerOnline,
                    Messages = source.Messages.ToList()
                };
            }
        }
    }
}
