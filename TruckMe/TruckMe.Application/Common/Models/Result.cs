// Common/Models/Result.cs
namespace TruckMe.Application.Common.Models;

public class Result
{
    public bool IsSuccess { get; }
    public string Error { get; }
    public bool IsFailure => !IsSuccess;

    protected Result(bool isSuccess, string error)
    {
        if (isSuccess && error != null)
            throw new InvalidOperationException("A successful result cannot have an error.");
        if (!isSuccess && error == null)
            throw new InvalidOperationException("A failure result must have an error.");

        IsSuccess = isSuccess;
        Error = error!;
    }

    public static Result Success() => new(true, null!);
    public static Result Failure(string error) => new(false, error);
}

public class Result<T> : Result
{
    public T Value { get; }

    protected Result(bool isSuccess, T value, string error)
        : base(isSuccess, error)
    {
        Value = value;
    }

    public static Result<T> Success(T value) => new(true, value, null!);
    public new static Result<T> Failure(string error) => new(false, default!, error);
}
