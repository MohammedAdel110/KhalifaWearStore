using KhalifaWearStore.Shared.DTOs.OrderDetail;

namespace KhalifaWearStore.Shared.DTOs.Order
{
    public class OrderDetailsDto
    {
        public int Id { get; set; }
        public DateTime OrderDate { get; set; }
        public bool Paid { get; set; }
        public DateTime? PaymentDate { get; set; }
        public string OrderStatus { get; set; } = "Pending";

        // Customer Snapshot
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string CustomerEmail { get; set; } = string.Empty;
        public string CustomerPhoneNo { get; set; } = string.Empty;
        public string CustomerCity { get; set; } = string.Empty;
        public string ShippingAddress { get; set; } = string.Empty;
        public string CustomerPostcode { get; set; } = string.Empty;

        // Payment Info
        public int PaymentId { get; set; }
        public string PaymentType { get; set; } = string.Empty;

        // Order Line Items & Grand Total
        public decimal Subtotal { get; set; }
        public decimal ShippingFee { get; set; }
        public decimal DiscountAmount { get; set; }
        public string? PromoCode { get; set; }
        public decimal OrderTotal { get; set; }
        public List<OrderDetailItemDto> Items { get; set; } = new();
    }
}
