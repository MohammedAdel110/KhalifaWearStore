using System.ComponentModel.DataAnnotations;

namespace KhalifaWearStore.Shared.DTOs.Customer
{
    public class CustomerToUpdateDto
    {
        [Required(ErrorMessage = "First name is required")]
        [MaxLength(100)]
        public string FirstName { get; set; } = null!;

        [Required(ErrorMessage = "Last name is required")]
        [MaxLength(100)]
        public string LastName { get; set; } = null!;

        [Required(ErrorMessage = "City is required")]
        [MaxLength(100)]
        public string City { get; set; } = null!;

        [Required(ErrorMessage = "Postcode is required")]
        [MaxLength(20)]
        public string Postcode { get; set; } = null!;

        [Required(ErrorMessage = "Phone number is required")]
        [MaxLength(30)]
        public string PhoneNo { get; set; } = null!;
    }
}
