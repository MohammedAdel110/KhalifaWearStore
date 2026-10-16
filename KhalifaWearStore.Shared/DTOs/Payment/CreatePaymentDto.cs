using System.ComponentModel.DataAnnotations;
using KhalifaWearStore.Shared.EnumHelper.PaymentEnums;

namespace KhalifaWearStore.Shared.DTOs.Payment
{
    public class CreatePaymentDto
    {
        [Required(ErrorMessage = "Payment type is required")]
        public PaymentType PaymentType { get; set; }
    }
}
