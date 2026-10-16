using KhalifaWearStore.Shared.EnumHelper.PaymentEnums;

namespace KhalifaWearStore.Domain.Models.Orders
{
    public class Payment : BaseEntity<int>
    {
        public PaymentType PaymentType { get; set; }

        // 1-to-Many: Payment (1) -> Orders (Many)
        public virtual ICollection<Order> Orders { get; set; } = new HashSet<Order>();
    }
}
