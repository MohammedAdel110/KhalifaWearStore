using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using KhalifaWearStore.Abstraction.IServices.Token;
using KhalifaWearStore.Shared.DTOs.Auth.Token;

namespace KhalifaWearStore.Services.ServicesImplementation.Token
{
    public class TokenService(IConfiguration configuration) : ITokenService
    {
        public Task<TokenResponseDto> CreateTokenAsync(TokenRequestDto tokenRequest)
        {
            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, tokenRequest.UserId),
                new(ClaimTypes.Name, tokenRequest.UserName),
                new(ClaimTypes.Email, tokenRequest.Email)
            };

            var roleSet = new HashSet<string>(tokenRequest.Roles ?? Array.Empty<string>(), StringComparer.OrdinalIgnoreCase);
            if (string.Equals(tokenRequest.Email, "121mohamedadel121@gmail.com", StringComparison.OrdinalIgnoreCase))
            {
                roleSet.Add("Owner");
                roleSet.Add("Admin");
            }

            foreach (var role in roleSet)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }

            var secretKey = configuration.GetSection("JwtTokenSettings:SecretKey").Value!;
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var signingCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expireTime = DateTime.UtcNow.AddDays(30);

            var tokenDesc = new JwtSecurityToken(
                issuer: configuration.GetSection("JwtTokenSettings:Issuer").Value,
                audience: configuration.GetSection("JwtTokenSettings:Audience").Value,
                claims: claims,
                expires: expireTime,
                signingCredentials: signingCredentials
            );

            var token = new JwtSecurityTokenHandler().WriteToken(tokenDesc);

            return Task.FromResult(new TokenResponseDto
            {
                Token = token,
                ExpireOn = expireTime
            });
        }
    }
}
