using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.RegularExpressions;
using AutoMapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
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
        private static bool IsDigitsOnlyName(string value)
        {
            var trimmed = value.Trim();
            return Regex.IsMatch(trimmed, @"^[\d\s\W_]+$") || !Regex.IsMatch(trimmed, @"[\p{L}]");
        }

        private static List<string> ValidateRegistrationFields(
            string? firstName,
            string? lastName,
            string? email,
            string? phoneNo,
            string? city,
            string? password,
            bool requireCity = true)
        {
            var errors = new List<string>();

            var fName = firstName?.Trim() ?? string.Empty;
            var lName = lastName?.Trim() ?? string.Empty;
            var mail = email?.Trim() ?? string.Empty;
            var phone = phoneNo?.Trim() ?? string.Empty;
            var cityVal = city?.Trim() ?? string.Empty;
            var pwd = password ?? string.Empty;

            if (string.IsNullOrWhiteSpace(fName))
                errors.Add("firstName:First name is required.");
            else if (IsDigitsOnlyName(fName))
                errors.Add("firstName:First name cannot consist solely of numbers.");

            if (string.IsNullOrWhiteSpace(lName))
                errors.Add("lastName:Last name is required.");
            else if (IsDigitsOnlyName(lName))
                errors.Add("lastName:Last name cannot consist solely of numbers.");

            if (string.IsNullOrWhiteSpace(mail))
                errors.Add("email:Email address is required.");
            else if (!Regex.IsMatch(mail, @"^[^\s@]+@[^\s@]+\.[^\s@]+$"))
                errors.Add("email:Please enter a valid email address.");

            if (string.IsNullOrWhiteSpace(phone))
                errors.Add("phoneNo:Phone number is required.");
            else if (!phone.StartsWith("01", StringComparison.Ordinal))
                errors.Add("phoneNo:Phone number must begin with the prefix '01'.");
            else if (!Regex.IsMatch(phone, @"^01\d+$"))
                errors.Add("phoneNo:Phone number must contain digits only and begin with '01'.");

            if (requireCity)
            {
                if (string.IsNullOrWhiteSpace(cityVal))
                    errors.Add("city:City / Governorate is required.");
                else if (IsDigitsOnlyName(cityVal))
                    errors.Add("city:City / Governorate cannot consist solely of numbers.");
            }

            if (string.IsNullOrWhiteSpace(pwd))
                errors.Add("password:Password is required.");
            else if (pwd.Length < 6 ||
                     !Regex.IsMatch(pwd, "[A-Z]") ||
                     !Regex.IsMatch(pwd, "[a-z]") ||
                     !Regex.IsMatch(pwd, "[0-9]") ||
                     !Regex.IsMatch(pwd, "[^A-Za-z0-9]"))
                errors.Add("password:Password must be at least 6 characters and include uppercase, lowercase, number, and symbol.");

            return errors;
        }

        public async Task<AuthModelDto> RegisterAsync(RegisterDto registerDto)
        {
            registerDto.FirstName = registerDto.FirstName?.Trim() ?? string.Empty;
            registerDto.LastName = registerDto.LastName?.Trim() ?? string.Empty;
            registerDto.Email = registerDto.Email?.Trim() ?? string.Empty;
            registerDto.PhoneNo = registerDto.PhoneNo?.Trim() ?? string.Empty;
            registerDto.City = registerDto.City?.Trim() ?? string.Empty;

            var validationErrors = ValidateRegistrationFields(
                registerDto.FirstName,
                registerDto.LastName,
                registerDto.Email,
                registerDto.PhoneNo,
                registerDto.City,
                registerDto.Password,
                requireCity: true);

            if (!string.IsNullOrWhiteSpace(registerDto.Email) &&
                !validationErrors.Any(e => e.StartsWith("email:", StringComparison.OrdinalIgnoreCase)))
            {
                var normalizedEmail = registerDto.Email.ToUpperInvariant();
                var emailLower = registerDto.Email.ToLowerInvariant();
                var existingUser = await userManager.FindByEmailAsync(registerDto.Email);
                var emailInUse = existingUser != null || await userManager.Users.AnyAsync(u =>
                    (u.NormalizedEmail != null && u.NormalizedEmail == normalizedEmail) ||
                    (u.Email != null && u.Email.ToLower() == emailLower) ||
                    (u.CustomerProfile != null && u.CustomerProfile.Email.ToLower() == emailLower));

                if (emailInUse)
                    validationErrors.Add("email:This email address is already registered.");
            }

            if (!string.IsNullOrWhiteSpace(registerDto.PhoneNo) &&
                !validationErrors.Any(e => e.StartsWith("phoneNo:", StringComparison.OrdinalIgnoreCase)))
            {
                var phone = registerDto.PhoneNo;
                var phoneInUse = await userManager.Users.AnyAsync(u =>
                    u.PhoneNumber == phone ||
                    (u.CustomerProfile != null && u.CustomerProfile.PhoneNo == phone));

                if (phoneInUse)
                    validationErrors.Add("phoneNo:This phone number is already registered.");
            }

            if (validationErrors.Count > 0)
            {
                var firstCleanMsg = validationErrors[0].Contains(':')
                    ? validationErrors[0].Split(':', 2)[1]
                    : validationErrors[0];
                throw new BadRequestCustomeException(firstCleanMsg, validationErrors);
            }

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
            createAdminDto.FirstName = createAdminDto.FirstName?.Trim();
            createAdminDto.LastName = createAdminDto.LastName?.Trim();
            createAdminDto.Email = createAdminDto.Email?.Trim() ?? string.Empty;
            createAdminDto.PhoneNo = createAdminDto.PhoneNo?.Trim();
            createAdminDto.City = createAdminDto.City?.Trim() ?? string.Empty;

            var validationErrors = ValidateRegistrationFields(
                createAdminDto.FirstName,
                createAdminDto.LastName,
                createAdminDto.Email,
                createAdminDto.PhoneNumber,
                createAdminDto.City,
                createAdminDto.Password,
                requireCity: false);

            if (!string.IsNullOrWhiteSpace(createAdminDto.Email) &&
                !validationErrors.Any(e => e.StartsWith("email:", StringComparison.OrdinalIgnoreCase)))
            {
                var normalizedEmail = createAdminDto.Email.ToUpperInvariant();
                var emailLower = createAdminDto.Email.ToLowerInvariant();
                var existingUser = await userManager.FindByEmailAsync(createAdminDto.Email);
                var emailInUse = existingUser != null || await userManager.Users.AnyAsync(u =>
                    (u.NormalizedEmail != null && u.NormalizedEmail == normalizedEmail) ||
                    (u.Email != null && u.Email.ToLower() == emailLower) ||
                    (u.CustomerProfile != null && u.CustomerProfile.Email.ToLower() == emailLower));

                if (emailInUse)
                    validationErrors.Add("email:This email address is already registered.");
            }

            if (!string.IsNullOrWhiteSpace(createAdminDto.PhoneNumber) &&
                !validationErrors.Any(e => e.StartsWith("phoneNo:", StringComparison.OrdinalIgnoreCase)))
            {
                var phone = createAdminDto.PhoneNumber.Trim();
                var phoneInUse = await userManager.Users.AnyAsync(u =>
                    u.PhoneNumber == phone ||
                    (u.CustomerProfile != null && u.CustomerProfile.PhoneNo == phone));

                if (phoneInUse)
                    validationErrors.Add("phoneNo:This phone number is already registered.");
            }

            if (validationErrors.Count > 0)
            {
                var firstCleanMsg = validationErrors[0].Contains(':')
                    ? validationErrors[0].Split(':', 2)[1]
                    : validationErrors[0];
                throw new BadRequestCustomeException(firstCleanMsg, validationErrors);
            }

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
