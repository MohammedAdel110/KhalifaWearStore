using System.ComponentModel.DataAnnotations;

namespace KhalifaWearStore.Shared.DTOs.Order
{
    public class UpdateOrderStatusDto
    {
        [Required]
        [MaxLength(40)]
        public string OrderStatus { get; set; } = "Pending";
    }
}
