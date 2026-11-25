export class AppError extends Error {
  #statusCode;
  #errors;

  constructor(message, statusCode = 400, errors = []) {
    super(message);
    this.name = 'AppError';
    this.#statusCode = statusCode;
    this.#errors = Array.isArray(errors) ? errors : [errors];
  }

  get statusCode() {
    return this.#statusCode;
  }

  get errors() {
    return [...this.#errors];
  }

  toJSON() {
    return {
      success: false,
      message: this.message,
      errors: this.#errors
    };
  }
}

export class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, errors);
    this.name = 'ValidationError';
  }
}
