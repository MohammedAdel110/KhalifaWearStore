using KhalifaWearStore.Domain.Models.User;

namespace KhalifaWearStore.Domain.Models.Orders
{
    public class Order : BaseEntity<int>
    {
        public DateTime OrderDate { get; set; } = DateTime.UtcNow;
        public bool Paid { get; set; }
        public DateTime? PaymentDate { get; set; }

        // Foreign Key: Customer (1) -> Orders (Many)
        public int CustomerId { get; set; }
        public virtual Customer Customer { get; set; } = null!;

        // Foreign Key: Payment (1) -> Orders (Many)
        public int PaymentId { get; set; }
        public virtual Payment Payment { get; set; } = null!;

        // 1-to-Many: Order (1) -> OrderDetails (Many)
        public virtual ICollection<OrderDetail> OrderDetails { get; set; } = new HashSet<OrderDetail>();
    }
}
