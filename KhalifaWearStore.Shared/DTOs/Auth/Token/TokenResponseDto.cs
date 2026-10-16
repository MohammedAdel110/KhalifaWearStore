namespace KhalifaWearStore.Shared.DTOs.Auth.Token
{
    public class TokenResponseDto
    {
        public string Token { get; set; } = string.Empty;
        public DateTime ExpireOn { get; set; }
    }
}
