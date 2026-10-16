using Microsoft.AspNetCore.Hosting;
using KhalifaWearStore.Abstraction.IServices.Attachment;
using KhalifaWearStore.Domain.Exceptions;
using KhalifaWearStore.Shared.DTOs.Uploads;

namespace KhalifaWearStore.Services.ServicesImplementation.Attachment
{
    public class AttachmentService(IWebHostEnvironment webHostEnvironment) : IAttachmentService
    {
        private readonly List<string> _allowedExtensions = [".jpg", ".png", ".jpeg", ".webp", ".pdf"];
        private const long FileSizeLimit = 8 * 1024 * 1024; // 8 MB

        public async Task<string> UploadFileAsync(UploadFileDto uploadFileDto)
        {
            if (uploadFileDto.File == null || uploadFileDto.File.Length == 0)
                throw new ArgumentNullException(nameof(uploadFileDto.File), "File cannot be null or empty");

            var fileExtension = Path.GetExtension(uploadFileDto.File.FileName).ToLowerInvariant();
            if (string.IsNullOrEmpty(fileExtension) || !_allowedExtensions.Contains(fileExtension))
                throw new BadRequestCustomeException("File type is not allowed. Allowed types are: jpg, png, jpeg, webp, pdf");

            if (uploadFileDto.File.Length > FileSizeLimit)
                throw new BadRequestCustomeException("This file is too large. Max size is 8MB.");

            var webRootPath = webHostEnvironment.WebRootPath;
            if (string.IsNullOrWhiteSpace(webRootPath))
                webRootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

            var relativeFolderPath = !string.IsNullOrEmpty(uploadFileDto.UserId)
                ? Path.Combine(uploadFileDto.FolderName, uploadFileDto.UserId)
                : uploadFileDto.FolderName;

            var folderPath = Path.Combine(webRootPath, relativeFolderPath);
            if (!Directory.Exists(folderPath))
                Directory.CreateDirectory(folderPath);

            var uniqueFileName = $"{Guid.NewGuid()}{fileExtension}";
            var fullPath = Path.Combine(folderPath, uniqueFileName);

            using (var stream = new FileStream(fullPath, FileMode.Create))
            {
                await uploadFileDto.File.CopyToAsync(stream);
            }

            return Path.Combine(relativeFolderPath, uniqueFileName).Replace("\\", "/");
        }

        public Task<bool> DeleteFileAsync(string filePath)
        {
            if (string.IsNullOrEmpty(filePath))
                return Task.FromResult(false);

            var webRootPath = webHostEnvironment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var fullPath = Path.Combine(webRootPath, filePath);

            if (File.Exists(fullPath))
            {
                File.Delete(fullPath);
                return Task.FromResult(true);
            }

            return Task.FromResult(false);
        }
    }
}
