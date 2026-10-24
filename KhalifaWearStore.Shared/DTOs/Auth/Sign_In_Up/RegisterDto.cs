namespace KhalifaWearStore.Shared.DTOs.Auth.Sign_In_Up
{
    public class RegisterDto
    {
        public string FirstName { get; set; } = string.Empty;

        public string LastName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;

        public string PhoneNo { get; set; } = string.Empty;

        public string City { get; set; } = string.Empty;

        public string Postcode { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;
    }
}
