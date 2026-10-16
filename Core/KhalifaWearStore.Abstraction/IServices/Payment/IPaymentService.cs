using KhalifaWearStore.Shared.DTOs.Payment;

namespace KhalifaWearStore.Abstraction.IServices.Payment
{
    public interface IPaymentService
    {
        Task<IReadOnlyList<PaymentDto>> GetAllPaymentsAsync();
        Task<PaymentDto> GetPaymentByIdAsync(int id);
        Task<PaymentDto> CreatePaymentAsync(CreatePaymentDto createDto);
        Task<bool> DeletePaymentAsync(int id);
    }
}
