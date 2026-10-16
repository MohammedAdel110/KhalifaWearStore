using KhalifaWearStore.Shared.EnumHelper.PaymentEnums;

namespace KhalifaWearStore.Shared.DTOs.Payment
{
    public class PaymentDto
    {
        public int Id { get; set; }
        public PaymentType PaymentType { get; set; }
    }
}
