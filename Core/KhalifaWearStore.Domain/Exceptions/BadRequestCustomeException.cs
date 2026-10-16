namespace KhalifaWearStore.Domain.Exceptions
{
    public class BadRequestCustomeException : Exception
    {
        public readonly IEnumerable<string>? Errors;
        public BadRequestCustomeException(string msg, IEnumerable<string>? errors = null)
            : base(msg)
        {
            Errors = errors;
        }
    }
}
