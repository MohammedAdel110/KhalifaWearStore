using KhalifaWearStore.Shared.Common.Pagination;
using KhalifaWearStore.Shared.Common.Params.Customer;
using KhalifaWearStore.Shared.DTOs.Customer;

namespace KhalifaWearStore.Abstraction.IServices.Customer
{
    public interface ICustomerService
    {
        // Customer Profile Operations (Logged-in Customer)
        Task<CustomerDetailsDto> GetMyProfileAsync(string applicationUserId);
        Task<CustomerDto> UpdateMyProfileAsync(string applicationUserId, CustomerToUpdateDto updateDto);

        // Admin Operations
        Task<PaginationResponse<CustomerDto>> GetAllCustomersAsync(CustomerQueryParams queryParams);
        Task<CustomerDetailsDto> GetCustomerByIdAsync(int customerId);
    }
}
