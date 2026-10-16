using KhalifaWearStore.Shared.DTOs.Uploads;

namespace KhalifaWearStore.Abstraction.IServices.Attachment
{
    public interface IAttachmentService
    {
        Task<string> UploadFileAsync(UploadFileDto uploadFileDto);
        Task<bool> DeleteFileAsync(string filePath);
    }
}
