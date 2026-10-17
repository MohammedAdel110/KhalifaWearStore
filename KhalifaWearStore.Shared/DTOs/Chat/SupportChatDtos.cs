namespace KhalifaWearStore.Shared.DTOs.Chat
{
    public class ChatMessageDto
    {
        public string Id { get; set; } = string.Empty;
        public string ThreadId { get; set; } = string.Empty;
        public string SenderRole { get; set; } = "Customer"; // "Customer" | "Admin"
        public string SenderName { get; set; } = string.Empty;
        public string? SenderEmail { get; set; }
        public string Text { get; set; } = string.Empty;
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
        public bool IsReadByAdmin { get; set; }
        public bool IsReadByCustomer { get; set; }
    }

    public class ChatThreadSummaryDto
    {
        public string ThreadId { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string? CustomerEmail { get; set; }
        public string LastMessageText { get; set; } = string.Empty;
        public DateTime LastMessageAt { get; set; } = DateTime.UtcNow;
        public int UnreadForAdminCount { get; set; }
        public int UnreadForCustomerCount { get; set; }
        public bool IsCustomerOnline { get; set; }
        public List<ChatMessageDto> Messages { get; set; } = new();
    }
}
