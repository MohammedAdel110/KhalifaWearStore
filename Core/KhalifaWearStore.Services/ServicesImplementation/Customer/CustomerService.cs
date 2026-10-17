using AutoMapper;
using Microsoft.AspNetCore.Identity;
using KhalifaWearStore.Abstraction.IServices.Customer;
using KhalifaWearStore.Domain.Contracts.UnitOfWorkPattern;
using KhalifaWearStore.Domain.Exceptions;
using KhalifaWearStore.Domain.Models.User;
using KhalifaWearStore.Services.Specifications.CustomerSpec;
using KhalifaWearStore.Shared.Common.Pagination;
using KhalifaWearStore.Shared.Common.Params.Customer;
using KhalifaWearStore.Shared.DTOs.Customer;
using CustomerEntity = KhalifaWearStore.Domain.Models.User.Customer;

namespace KhalifaWearStore.Services.ServicesImplementation.Customer
{
    public class CustomerService(
        IUnitOfWork unitOfWork,
        IMapper mapper,
        UserManager<ApplicationUser> userManager) : ICustomerService
    {
        private async Task<CustomerEntity> GetOrCreateCustomerAsync(string applicationUserId)
        {
            var repo = unitOfWork.GetRepository<CustomerEntity, int>();
            var spec = new CustomerByAppUserIdSpec(applicationUserId);
            var customer = await repo.GetByIdWithSpecAsync(spec);
            if (customer != null)
                return customer;

            var appUser = await userManager.FindByIdAsync(applicationUserId)
                ?? throw new NotFoundCutomeException("Customer profile not found for this account.");

            var nameParts = (appUser.FullName ?? string.Empty)
                .Split(' ', 2, StringSplitOptions.RemoveEmptyEntries);
            var firstName = nameParts.Length > 0 ? nameParts[0] : "Khalifa";
            var lastName = nameParts.Length > 1 ? nameParts[1] : "Member";

            customer = new CustomerEntity
            {
                FirstName = firstName,
                LastName = lastName,
                Email = appUser.Email ?? string.Empty,
                PhoneNo = !string.IsNullOrWhiteSpace(appUser.PhoneNumber) ? appUser.PhoneNumber : string.Empty,
                City = "Cairo",
                Postcode = "00000",
                Address = string.Empty,
                ApplicationUserId = appUser.Id
            };

            await repo.AddAsync(customer);
            await unitOfWork.SaveChangesAsync();

            return customer;
        }

        public async Task<CustomerDetailsDto> GetMyProfileAsync(string applicationUserId)
        {
            var customer = await GetOrCreateCustomerAsync(applicationUserId);
            return mapper.Map<CustomerDetailsDto>(customer);
        }

        public async Task<CustomerDto> UpdateMyProfileAsync(string applicationUserId, CustomerToUpdateDto updateDto)
        {
            var repo = unitOfWork.GetRepository<CustomerEntity, int>();
            var customer = await GetOrCreateCustomerAsync(applicationUserId);

            mapper.Map(updateDto, customer);
            customer.UpdatedAt = DateTime.UtcNow;

            repo.UpdateAsync(customer);
            await unitOfWork.SaveChangesAsync();

            return mapper.Map<CustomerDto>(customer);
        }

        public async Task<PaginationResponse<CustomerDto>> GetAllCustomersAsync(CustomerQueryParams queryParams)
        {
            var repo = unitOfWork.GetRepository<CustomerEntity, int>();

            var dataSpec = new CustomerWithFiltersSpec(queryParams, isCountSpec: false);
            var countSpec = new CustomerWithFiltersSpec(queryParams, isCountSpec: true);

            var customers = await repo.GetAllWithSpecAsync(dataSpec);
            var totalCount = await repo.GetCountAsync(countSpec);

            var mapped = mapper.Map<IReadOnlyList<CustomerDto>>(customers);

            return new PaginationResponse<CustomerDto>(
                queryParams.PageIndex,
                queryParams.PageSize,
                totalCount,
                mapped);
        }

        public async Task<CustomerDetailsDto> GetCustomerByIdAsync(int customerId)
        {
            var repo = unitOfWork.GetRepository<CustomerEntity, int>();
            var spec = new CustomerByIdWithOrdersSpec(customerId);
            var customer = await repo.GetByIdWithSpecAsync(spec)
                ?? throw new NotFoundCutomeException($"Customer with ID {customerId} was not found.");

            return mapper.Map<CustomerDetailsDto>(customer);
        }
    }
}
