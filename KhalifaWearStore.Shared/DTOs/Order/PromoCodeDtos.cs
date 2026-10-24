using System.ComponentModel.DataAnnotations;

namespace KhalifaWearStore.Shared.DTOs.Order
{
    public class PromoCodeDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string DiscountType { get; set; } = "Percentage";
        public decimal DiscountValue { get; set; }
        public decimal MinOrderSubtotal { get; set; }
        public bool IsActive { get; set; } = true;
        public bool IsFeaturedOnBanner { get; set; } = false;
        public string Description { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class CreatePromoCodeDto
    {
        [Required]
        public string Code { get; set; } = string.Empty;

        [Required]
        public string DiscountType { get; set; } = "Percentage"; // Percentage | FixedAmount | FreeShipping

        public decimal DiscountValue { get; set; }

        public decimal MinOrderSubtotal { get; set; }

        public string? Description { get; set; }

        public bool IsFeaturedOnBanner { get; set; } = false;
    }
}
