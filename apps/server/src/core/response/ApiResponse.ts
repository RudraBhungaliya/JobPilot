export class ApiResponse<T = unknown> {
  public readonly success: boolean;
  public readonly message: string;
  public readonly data?: T;

  constructor(success: boolean, message: string, data?: T) {
    this.success = success;
    this.message = message;
    this.data = data;
  }

  static success<T>(message = "Success", data?: T) {
    return new ApiResponse<T>(true, message, data);
  }

  static created<T>(message = "Created successfully", data?: T) {
    return new ApiResponse<T>(true, message, data);
  }

  static failure(message = "Failed") {
    return new ApiResponse(false, message);
  }
}
