using Microsoft.AspNetCore.Hosting;
using KhalifaWearStore.Abstraction.IServices.Attachment;
using KhalifaWearStore.Domain.Contracts.UnitOfWorkPattern;
using KhalifaWearStore.Domain.Exceptions;
using KhalifaWearStore.Domain.Models.Catalog;
using KhalifaWearStore.Shared.DTOs.Uploads;

namespace KhalifaWearStore.Services.ServicesImplementation.Attachment
{
    public class AttachmentService(
        IWebHostEnvironment webHostEnvironment,
        IUnitOfWork unitOfWork) : IAttachmentService
    {
        private readonly List<string> _allowedExtensions = [".jpg", ".png", ".jpeg", ".webp"];
        private const long FileSizeLimit = 8 * 1024 * 1024; // 8 MB

        private static bool HasValidImageSignature(Stream stream, string extension)
        {
            if (stream.Length < 12)
                return false;

            Span<byte> header = stackalloc byte[12];
            stream.Position = 0;
            var bytesRead = stream.Read(header);
            stream.Position = 0;

            if (bytesRead < 12)
                return false;

            return extension switch
            {
                ".jpg" or ".jpeg" => header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
                ".png" => header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47,
                ".webp" => header[0] == (byte)'R' && header[1] == (byte)'I' && header[2] == (byte)'F' && header[3] == (byte)'F'
                           && header[8] == (byte)'W' && header[9] == (byte)'E' && header[10] == (byte)'B' && header[11] == (byte)'P',
                _ => false
            };
        }

        public async Task<string> UploadFileAsync(UploadFileDto uploadFileDto)
        {
            if (uploadFileDto.File == null || uploadFileDto.File.Length == 0)
                throw new ArgumentNullException(nameof(uploadFileDto.File), "File cannot be null or empty");

            var fileExtension = Path.GetExtension(uploadFileDto.File.FileName).ToLowerInvariant();
            if (string.IsNullOrEmpty(fileExtension) || !_allowedExtensions.Contains(fileExtension))
                throw new BadRequestCustomeException("File type is not allowed. Allowed image types are: jpg, png, jpeg, webp");

            if (uploadFileDto.File.Length > FileSizeLimit)
                throw new BadRequestCustomeException("This file is too large. Max size is 8MB.");

            using (var readStream = uploadFileDto.File.OpenReadStream())
            {
                if (!HasValidImageSignature(readStream, fileExtension))
                    throw new BadRequestCustomeException("Invalid or corrupted image file content.");
            }

            var webRootPath = webHostEnvironment.WebRootPath;
            if (string.IsNullOrWhiteSpace(webRootPath))
                webRootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

            var fullWebRoot = Path.GetFullPath(webRootPath);

            var safeFolder = (uploadFileDto.FolderName ?? "images/products")
                .Replace("..", string.Empty)
                .Trim('/', '\\');
            var safeUserId = (uploadFileDto.UserId ?? string.Empty)
                .Replace("..", string.Empty)
                .Trim('/', '\\');

            var relativeFolderPath = !string.IsNullOrEmpty(safeUserId)
                ? Path.Combine(safeFolder, safeUserId)
                : safeFolder;

            var folderPath = Path.GetFullPath(Path.Combine(fullWebRoot, relativeFolderPath));
            if (!folderPath.StartsWith(fullWebRoot, StringComparison.OrdinalIgnoreCase))
                throw new BadRequestCustomeException("Invalid upload folder path.");

            if (!Directory.Exists(folderPath))
                Directory.CreateDirectory(folderPath);

            var uniqueFileName = $"{Guid.NewGuid()}{fileExtension}";
            var fullPath = Path.Combine(folderPath, uniqueFileName);

            using var memoryStream = new MemoryStream();
            await uploadFileDto.File.CopyToAsync(memoryStream);
            var fileBytes = memoryStream.ToArray();

            await File.WriteAllBytesAsync(fullPath, fileBytes);

            var relativeUrlPath = Path.Combine(relativeFolderPath, uniqueFileName).Replace("\\", "/");
            var contentType = fileExtension switch
            {
                ".png" => "image/png",
                ".webp" => "image/webp",
                _ => "image/jpeg"
            };

            try
            {
                var mediaRepo = unitOfWork.GetRepository<StoredMedia, int>();
                await mediaRepo.AddAsync(new StoredMedia
                {
                    RelativePath = relativeUrlPath,
                    ContentType = contentType,
                    FileBytes = fileBytes,
                    CreatedAt = DateTime.UtcNow
                });
                await unitOfWork.SaveChangesAsync();
            }
            catch
            {
                // Keep request successful even if media cache entry already exists
            }

            return relativeUrlPath;
        }

        public Task<bool> DeleteFileAsync(string filePath)
        {
            if (string.IsNullOrWhiteSpace(filePath))
                return Task.FromResult(false);

            var webRootPath = webHostEnvironment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var fullWebRoot = Path.GetFullPath(webRootPath);
            var cleanRelative = filePath.TrimStart('/', '\\');
            var fullPath = Path.GetFullPath(Path.Combine(fullWebRoot, cleanRelative));

            if (!fullPath.StartsWith(fullWebRoot, StringComparison.OrdinalIgnoreCase))
                return Task.FromResult(false);

            if (File.Exists(fullPath))
            {
                File.Delete(fullPath);
                return Task.FromResult(true);
            }

            return Task.FromResult(false);
        }
    }
}
