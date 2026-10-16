using System.ComponentModel.DataAnnotations;

namespace KhalifaWearStore.Shared.DTOs.Auth.ForgetPassword
{
    public class VerifyOtpDto
    {
        [Required(ErrorMessage = "Email is required")]
        [EmailAddress]
        public string Email { get; set; } = null!;

        [Required(ErrorMessage = "OTP is required")]
        public string Otp { get; set; } = null!;
    }
}
