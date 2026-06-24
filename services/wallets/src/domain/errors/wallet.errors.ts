export const INITIAL_BALANCE_CENTS = 100_000n;

export class InvalidAmountError extends Error {
  constructor() {
    super("Amount must be greater than zero");
    this.name = "InvalidAmountError";
  }
}

export class InsufficientBalanceError extends Error {
  constructor() {
    super("Insufficient balance");
    this.name = "InsufficientBalanceError";
  }
}

export class WalletAlreadyExistsError extends Error {
  constructor() {
    super("Wallet already exists for this user");
    this.name = "WalletAlreadyExistsError";
  }
}

export class WalletNotFoundError extends Error {
  constructor() {
    super("Wallet not found");
    this.name = "WalletNotFoundError";
  }
}

export class DuplicateOperationError extends Error {
  constructor() {
    super("Operation already processed");
    this.name = "DuplicateOperationError";
  }
}
