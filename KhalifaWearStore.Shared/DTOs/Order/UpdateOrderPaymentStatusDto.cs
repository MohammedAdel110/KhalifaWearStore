namespace KhalifaWearStore.Shared.DTOs.Order
{
    public class UpdateOrderPaymentStatusDto
    {
        public bool Paid { get; set; }
        public DateTime? PaymentDate { get; set; }
    }
}
