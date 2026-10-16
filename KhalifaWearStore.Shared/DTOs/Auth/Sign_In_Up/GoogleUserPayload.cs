namespace KhalifaWearStore.Shared.DTOs.Auth.Sign_In_Up
{
    public class GoogleUserPayload
    {
        public string Sub { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Given_name { get; set; } = string.Empty;
        public string Family_name { get; set; } = string.Empty;
        public string Picture { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public bool Email_verified { get; set; }
    }
}
