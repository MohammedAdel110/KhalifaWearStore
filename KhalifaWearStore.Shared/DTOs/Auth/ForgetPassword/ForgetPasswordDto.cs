using System.ComponentModel.DataAnnotations;

namespace KhalifaWearStore.Shared.DTOs.Auth.ForgetPassword
{
    public class ForgetPasswordDto
    {
        [Required(ErrorMessage = "Email is required")]
        [EmailAddress(ErrorMessage = "Invalid email format")]
        public string Email { get; set; } = null!;
    }
}
