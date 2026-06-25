export class InvalidBetAmountError extends Error {
  constructor() {
    super("Bet amount must be between 1.00 and 1,000.00");
    this.name = "InvalidBetAmountError";
  }
}

export class RoundNotAcceptingBetsError extends Error {
  constructor() {
    super("Round is not accepting bets");
    this.name = "RoundNotAcceptingBetsError";
  }
}

export class DuplicateBetError extends Error {
  constructor() {
    super("Player already has a bet in this round");
    this.name = "DuplicateBetError";
  }
}

export class BetNotFoundError extends Error {
  constructor() {
    super("Bet not found");
    this.name = "BetNotFoundError";
  }
}

export class CashoutNotAllowedError extends Error {
  constructor() {
    super("Cashout is not allowed");
    this.name = "CashoutNotAllowedError";
  }
}

export class InvalidRoundTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRoundTransitionError";
  }
}

export class InvalidMultiplierError extends Error {
  constructor() {
    super("Invalid multiplier");
    this.name = "InvalidMultiplierError";
  }
}
