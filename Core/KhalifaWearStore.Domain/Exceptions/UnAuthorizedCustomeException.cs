namespace KhalifaWearStore.Domain.Exceptions
{
    public class UnAuthorizedCustomeException(string msg = "Invalid email or password") : Exception(msg)
    {
    }
}
