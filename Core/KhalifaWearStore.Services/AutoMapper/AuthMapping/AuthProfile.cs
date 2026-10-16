using AutoMapper;
using KhalifaWearStore.Domain.Models.User;
using KhalifaWearStore.Shared.DTOs.Auth.Sign_In_Up;

namespace KhalifaWearStore.Services.AutoMapper.AuthMapping
{
    public class AuthProfile : Profile
    {
        public AuthProfile()
        {
            CreateMap<RegisterDto, ApplicationUser>()
                .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => src.Email.ToUpperInvariant()))
                .ForMember(dest => dest.FullName, opt => opt.MapFrom(src => $"{src.FirstName} {src.LastName}".Trim()))
                .ForMember(dest => dest.PhoneNumber, opt => opt.MapFrom(src => src.PhoneNo));

            CreateMap<RegisterDto, Customer>();
        }
    }
}
