using KhalifaWearStore.Shared.DTOs.Auth.ForgetPassword;
using KhalifaWearStore.Shared.DTOs.Auth.Sign_In_Up;

namespace KhalifaWearStore.Abstraction.IServices.Auth
{
    public interface IAuthService
    {
        Task<AuthModelDto> LoginAsync(LoginDto loginDto);
        Task<AuthModelDto> RegisterAsync(RegisterDto registerDto);
        Task<AuthModelDto> CreateAdminAsync(CreateAdminDto createAdminDto);
        Task<IReadOnlyList<AdminAccountDto>> GetAllAdminsAsync();
        Task<bool> DeleteAdminAsync(string adminUserId);
        Task ForgetPasswordAsync(ForgetPasswordDto forgetPasswordDto);
        Task<bool> VerifyOtpAsync(VerifyOtpDto verifyOtpDto);
        Task<AuthModelDto> ResetPasswordAsync(ResetPasswordDto resetPasswordDto);
        Task<AuthModelDto> GoogleAuthAsync(GoogleAuthDto googleAuthDto);
    }
}
