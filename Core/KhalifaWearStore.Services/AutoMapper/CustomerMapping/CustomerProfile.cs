using AutoMapper;
using KhalifaWearStore.Domain.Models.User;
using KhalifaWearStore.Shared.DTOs.Customer;

namespace KhalifaWearStore.Services.AutoMapper.CustomerMapping
{
    public class CustomerProfile : Profile
    {
        public CustomerProfile()
        {
            CreateMap<Customer, CustomerDto>();
            CreateMap<Customer, CustomerDetailsDto>();
            CreateMap<CustomerToUpdateDto, Customer>();
        }
    }
}
