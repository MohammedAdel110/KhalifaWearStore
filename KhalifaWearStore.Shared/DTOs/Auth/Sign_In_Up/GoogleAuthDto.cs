using System.ComponentModel.DataAnnotations;

namespace KhalifaWearStore.Shared.DTOs.Auth.Sign_In_Up
{
    public class GoogleAuthDto
    {
        [Required(ErrorMessage = "Google ID Token is required")]
        public string IdToken { get; set; } = null!;
    }
}
