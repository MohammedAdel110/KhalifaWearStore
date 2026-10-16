namespace KhalifaWearStore.Shared.DTOs.Order
{
    public class OrderDto
    {
        public int Id { get; set; }
        public DateTime OrderDate { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public int PaymentId { get; set; }
        public string PaymentType { get; set; } = string.Empty;
        public bool Paid { get; set; }
        public DateTime? PaymentDate { get; set; }
        public decimal OrderTotal { get; set; }
        public int TotalItemsCount { get; set; }
    }
}
