using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using KhalifaWearStore.Abstraction.IServices.Auth;
using KhalifaWearStore.Shared.Common.Response;
using KhalifaWearStore.Shared.DTOs.Auth.ForgetPassword;
using KhalifaWearStore.Shared.DTOs.Auth.Sign_In_Up;

namespace KhalifaWearStore.Presentation.Controllers.Auth
{
    public class AuthController(IAuthService authService) : AppBaseController
    {
        // 1. Public Customer Registration (Always assigns Customer role)
        [HttpPost("register")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<AuthModelDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        public async Task<ActionResult> Register([FromBody] RegisterDto dto)
        {
            var result = await authService.RegisterAsync(dto);
            return Success(result, "Account Created Successfully");
        }

        // 2. Admin-Only Endpoint to Add Another Admin
        [HttpPost("create-admin")]
        [Authorize(Roles = "Admin")]
        [ProducesResponseType(typeof(ApiResponse<AuthModelDto>), StatusCodes.Status201Created)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status403Forbidden)]
        public async Task<ActionResult> CreateAdmin([FromBody] CreateAdminDto dto)
        {
            var result = await authService.CreateAdminAsync(dto);
            return Created(result, "Admin Account Created Successfully");
        }

        // 3. Login
        [HttpPost("login")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<AuthModelDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult> Login([FromBody] LoginDto dto)
        {
            var result = await authService.LoginAsync(dto);
            return Success(result, "Login Successfully");
        }

        // 4. Forget Password
        [HttpPost("forget-password")]
        [AllowAnonymous]
        [EnableRateLimiting("OtpPolicy")]
        public async Task<ActionResult> ForgetPassword([FromBody] ForgetPasswordDto dto)
        {
            await authService.ForgetPasswordAsync(dto);
            return Success("OTP sent to your email if the account exists");
        }

        // 5. Verify OTP
        [HttpPost("verify-otp")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<string>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        public async Task<ActionResult> VerifyOtp([FromBody] VerifyOtpDto dto)
        {
            var isValid = await authService.VerifyOtpAsync(dto);
            if (!isValid)
                return BadRequestError("OTP Not Valid or Incorrect");

            return Success("OTP is Valid");
        }

        // 6. Reset Password
        [HttpPost("reset-password")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<AuthModelDto>), StatusCodes.Status200OK)]
        public async Task<ActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            var result = await authService.ResetPasswordAsync(dto);
            return Success(result, "Your password has changed successfully");
        }

        // 7. Google Smart Login / Register
        [HttpPost("google-auth")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<AuthModelDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult> GoogleAuth([FromBody] GoogleAuthDto dto)
        {
            var result = await authService.GoogleAuthAsync(dto);
            return Success(result, "Authenticated with Google Successfully");
        }
    }
}
