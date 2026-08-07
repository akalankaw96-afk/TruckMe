// Common/Exceptions/ValidationException.cs
using FluentValidation.Results;

namespace TruckMe.Application.Common.Exceptions;

public class ValidationException : ApplicationException
{
    public IDictionary<string, string[]> Errors { get; }

    public ValidationException(IDictionary<string, string[]> errors)
        : base("One or more validation failures have occurred.")
    {
        Errors = errors;
    }

    public ValidationException(string message)
        : base(message)
    {
        Errors = new Dictionary<string, string[]>
        {
            { "General", new[] { message } }
        };
    }

    public static ValidationException Fail(IEnumerable<ValidationFailure> failures)
    {
        var errors = failures
            .GroupBy(f => f.PropertyName, f => f.ErrorMessage)
            .ToDictionary(
                g => g.Key,
                g => g.ToArray()
            );

        return new ValidationException(errors);
    }
}
