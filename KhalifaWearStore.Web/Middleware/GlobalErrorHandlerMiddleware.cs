using System.Text.Json;
using KhalifaWearStore.Domain.Exceptions;
using KhalifaWearStore.Shared.Common.Response;

namespace KhalifaWearStore.Web.Middleware
{
    public class GlobalErrorHandlerMiddleware(
        RequestDelegate nextMW,
        ILogger<GlobalErrorHandlerMiddleware> logger,
        IWebHostEnvironment env)
    {
        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await nextMW(context);
                if (context.Response.StatusCode == 404 && !context.Response.HasStarted)
                {
                    await HandleResponseException(context, 404, "The requested resource was not found.");
                }
            }
            catch (Exception e)
            {
                logger.LogError(e, "Error: {Message}", e.Message);
                await HandleExceptionAsync(context, e);
            }
        }

        public async Task HandleResponseException(HttpContext context, int statusCode, string msg)
        {
            context.Response.StatusCode = statusCode;
            context.Response.ContentType = "application/json";

            var response = new ApiResponse<string>(msg, statusCode);

            var jsonResponse = JsonSerializer.Serialize(
                response,
                new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });
            await context.Response.WriteAsync(jsonResponse);
        }

        public async Task HandleExceptionAsync(HttpContext context, Exception ex)
        {
            context.Response.ContentType = "application/json";
            string serverErrorMsg = env.IsDevelopment()
                ? $"{ex.Message} \n {ex.StackTrace}"
                : "An unexpected error occurred. Please try again later.";

            var response = ex switch
            {
                NotFoundCutomeException => new ApiResponse<string>(ex.Message, 404),
                UnAuthorizedCustomeException => new ApiResponse<string>(ex.Message, 401),
                BadRequestCustomeException br => new ApiResponse<string>(ex.Message, 400, errors: br.Errors?.ToList()),
                _ => new ApiResponse<string>(serverErrorMsg, 500)
            };

            context.Response.StatusCode = response.StatusCode;
            response.IsSuccess = false;

            var jsonResponse = JsonSerializer.Serialize(
                response,
                new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });
            await context.Response.WriteAsync(jsonResponse);
        }
    }
}
