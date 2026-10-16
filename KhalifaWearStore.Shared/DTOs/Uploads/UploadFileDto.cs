using Microsoft.AspNetCore.Http;

namespace KhalifaWearStore.Shared.DTOs.Uploads
{
    public class UploadFileDto
    {
        public IFormFile File { get; set; } = null!;
        public string? UserId { get; set; }
        public string FolderName { get; set; } = null!;
    }
}
