using System.ComponentModel.DataAnnotations;

namespace KhalifaWearStore.Shared.DTOs.Auth.Sign_In_Up
{
    public class CreateAdminDto
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }

        private string? _fullName;
        public string FullName
        {
            get => !string.IsNullOrWhiteSpace(_fullName)
                ? _fullName
                : $"{FirstName} {LastName}".Trim();
            set => _fullName = value;
        }

        [Required, EmailAddress]
        public string Email { get; set; } = default!;

        public string? PhoneNo { get; set; }

        private string? _phoneNumber;
        public string PhoneNumber
        {
            get => !string.IsNullOrWhiteSpace(_phoneNumber)
                ? _phoneNumber
                : (PhoneNo ?? string.Empty);
            set => _phoneNumber = value;
        }

        public string City { get; set; } = string.Empty;

        public string Postcode { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = default!;
    }

    public class AdminAccountDto
    {
        public string Id { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string Role { get; set; } = "Admin";
    }
}
