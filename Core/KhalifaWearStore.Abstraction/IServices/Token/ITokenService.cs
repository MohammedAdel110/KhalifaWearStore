using KhalifaWearStore.Shared.DTOs.Auth.Token;

namespace KhalifaWearStore.Abstraction.IServices.Token
{
    public interface ITokenService
    {
        Task<TokenResponseDto> CreateTokenAsync(TokenRequestDto tokenRequest);
    }
}
