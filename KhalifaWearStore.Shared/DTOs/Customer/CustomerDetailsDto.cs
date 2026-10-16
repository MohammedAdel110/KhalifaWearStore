using KhalifaWearStore.Shared.DTOs.Order;

namespace KhalifaWearStore.Shared.DTOs.Customer
{
    public class CustomerDetailsDto
    {
        public int Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string FullName => $"{FirstName} {LastName}".Trim();
        public string City { get; set; } = string.Empty;
        public string Postcode { get; set; } = string.Empty;
        public string PhoneNo { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string ApplicationUserId { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public List<OrderDto> Orders { get; set; } = new();
    }
}
