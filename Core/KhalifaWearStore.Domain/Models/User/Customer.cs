using KhalifaWearStore.Domain.Models.Orders;

namespace KhalifaWearStore.Domain.Models.User
{
    public class Customer : BaseEntity<int>
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string Postcode { get; set; } = string.Empty;
        public string PhoneNo { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;

        // 1-to-1 relationship with ASP.NET Identity ApplicationUser
        public string ApplicationUserId { get; set; } = string.Empty;
        public virtual ApplicationUser ApplicationUser { get; set; } = null!;

        // 1-to-Many: Customer (1) -> Orders (Many)
        public virtual ICollection<Order> Orders { get; set; } = new HashSet<Order>();
    }
}
