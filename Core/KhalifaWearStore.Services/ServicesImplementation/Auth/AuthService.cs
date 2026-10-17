using System.Net.Http.Headers;
using System.Text.Json;
using AutoMapper;
using Microsoft.AspNetCore.Identity;
using KhalifaWearStore.Abstraction.IServices.Auth;
using KhalifaWearStore.Abstraction.IServices.Token;
using KhalifaWearStore.Domain.Exceptions;
using KhalifaWearStore.Domain.Models.User;
using KhalifaWearStore.Shared.DTOs.Auth.ForgetPassword;
using KhalifaWearStore.Shared.DTOs.Auth.Sign_In_Up;
using KhalifaWearStore.Shared.DTOs.Auth.Token;
using KhalifaWearStore.Shared.EnumHelper.UserEnums;

namespace KhalifaWearStore.Services.ServicesImplementation.Auth
{
    public class AuthService(
        UserManager<ApplicationUser> userManager,
        IMapper mapper,
        ITokenService tokenService) : IAuthService
    {
        public async Task<AuthModelDto> RegisterAsync(RegisterDto registerDto)
        {
            var existingUser = await userManager.FindByEmailAsync(registerDto.Email);
            if (existingUser != null)
                throw new BadRequestCustomeException("User with this email already exists.");

            var userForDb = mapper.Map<ApplicationUser>(registerDto);
            userForDb.Role = UserRole.Customer;
            userForDb.CustomerProfile = mapper.Map<Domain.Models.User.Customer>(registerDto);

            var result = await userManager.CreateAsync(userForDb, registerDto.Password);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description);
                throw new BadRequestCustomeException("User registration failed", errors);
            }

            await userManager.AddToRoleAsync(userForDb, UserRole.Customer.ToString());

            var userRoles = await userManager.GetRolesAsync(userForDb);

            var tokenRequest = new TokenRequestDto
            {
                UserId = userForDb.Id,
                Email = userForDb.Email!,
                UserName = userForDb.FullName,
                Roles = userRoles
            };

            var tokenResponse = await tokenService.CreateTokenAsync(tokenRequest);
            if (string.IsNullOrEmpty(tokenResponse.Token))
                throw new BadRequestCustomeException("Token generation failed.");

            return new AuthModelDto
            {
                Token = tokenResponse.Token,
                IsAuthenticated = true,
                ExpireOn = tokenResponse.ExpireOn,
                Email = userForDb.Email!,
                Name = userForDb.FullName,
                PhoneNumber = userForDb.PhoneNumber ?? string.Empty,
                Roles = userRoles
            };
        }

        public async Task<AuthModelDto> CreateAdminAsync(CreateAdminDto createAdminDto)
        {
            var existingUser = await userManager.FindByEmailAsync(createAdminDto.Email);
            if (existingUser != null)
                throw new BadRequestCustomeException("User with this email already exists.");

            var adminUser = new ApplicationUser
            {
                UserName = createAdminDto.Email.ToUpperInvariant(),
                Email = createAdminDto.Email,
                FullName = createAdminDto.FullName,
                PhoneNumber = createAdminDto.PhoneNumber,
                Role = UserRole.Admin,
                EmailConfirmed = true
            };

            var result = await userManager.CreateAsync(adminUser, createAdminDto.Password);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description);
                throw new BadRequestCustomeException("Admin creation failed", errors);
            }

            await userManager.AddToRoleAsync(adminUser, UserRole.Admin.ToString());
            var userRoles = await userManager.GetRolesAsync(adminUser);

            return new AuthModelDto
            {
                Message = "Admin account created successfully",
                IsAuthenticated = true,
                Email = adminUser.Email!,
                Name = adminUser.FullName,
                PhoneNumber = adminUser.PhoneNumber ?? string.Empty,
                Roles = userRoles
            };
        }

        public async Task<IReadOnlyList<AdminAccountDto>> GetAllAdminsAsync()
        {
            var admins = await userManager.GetUsersInRoleAsync(UserRole.Admin.ToString());
            var owners = await userManager.GetUsersInRoleAsync(UserRole.Owner.ToString());
            var ownerIds = owners.Select(o => o.Id).ToHashSet(StringComparer.OrdinalIgnoreCase);

            var list = admins
                .Select(u => new AdminAccountDto
                {
                    Id = u.Id,
                    FullName = u.FullName,
                    Email = u.Email ?? string.Empty,
                    PhoneNumber = u.PhoneNumber ?? string.Empty,
                    Role = ownerIds.Contains(u.Id) || u.Role == UserRole.Owner ? "Owner" : "Admin"
                })
                .OrderByDescending(a => a.Role == "Owner")
                .ThenBy(a => a.FullName)
                .ToList();

            return list;
        }

        public async Task<bool> DeleteAdminAsync(string adminUserId)
        {
            var user = await userManager.FindByIdAsync(adminUserId)
                ?? throw new NotFoundCutomeException("Admin user not found.");

            var isOwner = await userManager.IsInRoleAsync(user, UserRole.Owner.ToString())
                          || user.Role == UserRole.Owner
                          || string.Equals(user.Email, "121mohamedadel121@gmail.com", StringComparison.OrdinalIgnoreCase);

            if (isOwner)
                throw new BadRequestCustomeException("The Store Owner account cannot be deleted.");

            var result = await userManager.DeleteAsync(user);
            return result.Succeeded;
        }

        public async Task<AuthModelDto> LoginAsync(LoginDto loginDto)
        {
            var user = await userManager.FindByEmailAsync(loginDto.Email);
            if (user == null)
                throw new UnAuthorizedCustomeException();

            var result = await userManager.CheckPasswordAsync(user, loginDto.Password);
            if (!result)
                throw new UnAuthorizedCustomeException();

            var userRoles = await userManager.GetRolesAsync(user);
            var tokenRequest = new TokenRequestDto
            {
                UserId = user.Id,
                Email = user.Email!,
                UserName = user.FullName,
                Roles = userRoles
            };

            var tokenResp = await tokenService.CreateTokenAsync(tokenRequest);
            if (string.IsNullOrEmpty(tokenResp.Token))
                throw new BadRequestCustomeException("Token generation failed.");

            return new AuthModelDto
            {
                Token = tokenResp.Token,
                IsAuthenticated = true,
                ExpireOn = tokenResp.ExpireOn,
                Email = user.Email!,
                Name = user.FullName,
                PhoneNumber = user.PhoneNumber ?? string.Empty,
                Roles = userRoles
            };
        }

        public async Task ForgetPasswordAsync(ForgetPasswordDto forgetPasswordDto)
        {
            var user = await userManager.FindByEmailAsync(forgetPasswordDto.Email);
            if (user == null)
                return;

            _ = await userManager.GeneratePasswordResetTokenAsync(user);
        }

        public async Task<bool> VerifyOtpAsync(VerifyOtpDto verifyOtpDto)
        {
            var user = await userManager.FindByEmailAsync(verifyOtpDto.Email);
            if (user == null)
                return false;

            return await userManager.VerifyUserTokenAsync(
                user,
                userManager.Options.Tokens.PasswordResetTokenProvider,
                UserManager<ApplicationUser>.ResetPasswordTokenPurpose,
                verifyOtpDto.Otp);
        }

        public async Task<AuthModelDto> ResetPasswordAsync(ResetPasswordDto resetPasswordDto)
        {
            var user = await userManager.FindByEmailAsync(resetPasswordDto.Email);
            if (user == null)
                throw new UnAuthorizedCustomeException();

            var result = await userManager.ResetPasswordAsync(user, resetPasswordDto.Otp, resetPasswordDto.NewPassword);
            if (!result.Succeeded)
            {
                var errors = result.Errors.Select(e => e.Description);
                throw new BadRequestCustomeException("Password reset failed.", errors);
            }

            var userRoles = await userManager.GetRolesAsync(user);
            var tokenRequest = new TokenRequestDto
            {
                UserId = user.Id,
                Email = user.Email!,
                UserName = user.FullName,
                Roles = userRoles
            };
            var tokenRespo = await tokenService.CreateTokenAsync(tokenRequest);

            return new AuthModelDto
            {
                Token = tokenRespo.Token,
                IsAuthenticated = true,
                ExpireOn = tokenRespo.ExpireOn,
                Email = user.Email!,
                Name = user.FullName,
                PhoneNumber = user.PhoneNumber ?? string.Empty,
                Roles = userRoles
            };
        }

        public async Task<AuthModelDto> GoogleAuthAsync(GoogleAuthDto googleAuthDto)
        {
            GoogleUserPayload? payload;

            try
            {
                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", googleAuthDto.IdToken);

                var response = await httpClient.GetAsync("https://www.googleapis.com/oauth2/v3/userinfo");
                if (!response.IsSuccessStatusCode)
                    throw new UnAuthorizedCustomeException("Invalid Google Token");

                var content = await response.Content.ReadAsStringAsync();
                payload = JsonSerializer.Deserialize<GoogleUserPayload>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (payload == null || string.IsNullOrEmpty(payload.Email))
                    throw new UnAuthorizedCustomeException("Failed to retrieve email from Google.");
            }
            catch (Exception)
            {
                throw new UnAuthorizedCustomeException("Invalid Google Token");
            }

            var user = await userManager.FindByEmailAsync(payload.Email);
            if (user == null)
            {
                user = new ApplicationUser
                {
                    UserName = payload.Email.Split('@')[0].ToUpperInvariant(),
                    Email = payload.Email,
                    FullName = payload.Name,
                    EmailConfirmed = true,
                    Role = UserRole.Customer,
                    CustomerProfile = new Domain.Models.User.Customer
                    {
                        FirstName = !string.IsNullOrEmpty(payload.Given_name) ? payload.Given_name : payload.Name,
                        LastName = payload.Family_name ?? string.Empty,
                        Email = payload.Email,
                        City = "Not Specified",
                        Postcode = "00000",
                        PhoneNo = "0000000000"
                    }
                };

                var createResult = await userManager.CreateAsync(user);
                if (!createResult.Succeeded)
                    throw new BadRequestCustomeException("Failed to create user from Google.");

                await userManager.AddToRoleAsync(user, UserRole.Customer.ToString());
            }

            var userRoles = await userManager.GetRolesAsync(user);
            var tokenRequest = new TokenRequestDto
            {
                UserId = user.Id,
                Email = user.Email!,
                UserName = user.FullName,
                Roles = userRoles
            };

            var tokenResp = await tokenService.CreateTokenAsync(tokenRequest);
            if (string.IsNullOrEmpty(tokenResp.Token))
                throw new BadRequestCustomeException("Token generation failed.");

            return new AuthModelDto
            {
                Token = tokenResp.Token,
                IsAuthenticated = true,
                ExpireOn = tokenResp.ExpireOn,
                Email = user.Email!,
                Name = user.FullName,
                PhoneNumber = user.PhoneNumber ?? string.Empty,
                Roles = userRoles
            };
        }
    }
}
