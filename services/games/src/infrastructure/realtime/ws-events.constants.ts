export const WS_EVENTS = {
  ROUND_SYNC: "round:sync",
  ROUND_BETTING: "round:betting",
  ROUND_RUNNING: "round:running",
  ROUND_TICK: "round:tick",
  ROUND_CRASHED: "round:crashed",
  BET_PLACED: "bet:placed",
  BET_ACTIVATED: "bet:activated",
  BET_REMOVED: "bet:removed",
  BET_CASHED_OUT: "bet:cashed_out",
} as const;
