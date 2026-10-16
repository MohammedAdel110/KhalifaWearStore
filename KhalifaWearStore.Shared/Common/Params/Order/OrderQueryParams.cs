namespace KhalifaWearStore.Shared.Common.Params.Order
{
    public class OrderQueryParams : BaseQueryParam
    {
        public int? CustomerId { get; set; }
        public int? PaymentId { get; set; }
        public bool? Paid { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }
}
