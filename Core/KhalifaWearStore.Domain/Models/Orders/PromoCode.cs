namespace KhalifaWearStore.Domain.Models.Orders
{
    public class PromoCode : BaseEntity<int>
    {
        public string Code { get; set; } = string.Empty;
        public string DiscountType { get; set; } = "Percentage"; // Percentage | FixedAmount | FreeShipping
        public decimal DiscountValue { get; set; }
        public decimal MinOrderSubtotal { get; set; }
        public bool IsActive { get; set; } = true;
        public string Description { get; set; } = string.Empty;
    }
}
