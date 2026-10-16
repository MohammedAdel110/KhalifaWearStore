using System.ComponentModel.DataAnnotations;

namespace KhalifaWearStore.Shared.DTOs.Auth.Sign_In_Up
{
    public class RegisterDto
    {
        [Required]
        public string FirstName { get; set; } = default!;

        [Required]
        public string LastName { get; set; } = default!;

        [Required, EmailAddress]
        public string Email { get; set; } = default!;

        [Required]
        public string PhoneNo { get; set; } = default!;

        [Required]
        public string City { get; set; } = default!;

        public string Postcode { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = default!;
    }
}
