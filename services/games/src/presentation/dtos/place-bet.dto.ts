import { IsInt, Max, Min } from "class-validator";

export class PlaceBetDto {
  @IsInt()
  @Min(100)
  @Max(100_000)
  amountCents!: number;
}
