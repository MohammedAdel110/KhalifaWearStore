using AutoMapper;
using KhalifaWearStore.Abstraction.IServices.Payment;
using KhalifaWearStore.Domain.Contracts.UnitOfWorkPattern;
using KhalifaWearStore.Domain.Exceptions;
using KhalifaWearStore.Shared.DTOs.Payment;
using PaymentEntity = KhalifaWearStore.Domain.Models.Orders.Payment;

namespace KhalifaWearStore.Services.ServicesImplementation.Payment
{
    public class PaymentService(IUnitOfWork unitOfWork, IMapper mapper) : IPaymentService
    {
        public async Task<IReadOnlyList<PaymentDto>> GetAllPaymentsAsync()
        {
            var repo = unitOfWork.GetRepository<PaymentEntity, int>();
            var payments = await repo.GetAllAsync();
            var activePayments = payments.Where(p => !p.IsDeleted).ToList();

            return mapper.Map<IReadOnlyList<PaymentDto>>(activePayments);
        }

        public async Task<PaymentDto> GetPaymentByIdAsync(int id)
        {
            var repo = unitOfWork.GetRepository<PaymentEntity, int>();
            var payment = await repo.GetByIdAsync(id);
            if (payment == null || payment.IsDeleted)
                throw new NotFoundCutomeException($"Payment method with ID {id} was not found.");

            return mapper.Map<PaymentDto>(payment);
        }

        public async Task<PaymentDto> CreatePaymentAsync(CreatePaymentDto createDto)
        {
            var repo = unitOfWork.GetRepository<PaymentEntity, int>();
            var payment = mapper.Map<PaymentEntity>(createDto);

            await repo.AddAsync(payment);
            var saved = await unitOfWork.SaveChangesAsync();
            if (saved <= 0)
                throw new BadRequestCustomeException("Failed to create payment method.");

            return mapper.Map<PaymentDto>(payment);
        }

        public async Task<bool> DeletePaymentAsync(int id)
        {
            var repo = unitOfWork.GetRepository<PaymentEntity, int>();
            var payment = await repo.GetByIdAsync(id);
            if (payment == null || payment.IsDeleted)
                throw new NotFoundCutomeException($"Payment method with ID {id} was not found.");

            payment.IsDeleted = true;
            payment.UpdatedAt = DateTime.UtcNow;

            repo.UpdateAsync(payment);
            return await unitOfWork.SaveChangesAsync() > 0;
        }
    }
}
