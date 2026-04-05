import { IsOptional, IsEnum, IsDateString, IsInt, Min, Max } from "class-validator";
import { Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class QueryTransactionDto {
  @ApiPropertyOptional({ enum: ["revenue", "expense"] })
  @IsEnum(["revenue", "expense"])
  @IsOptional()
  type?: "revenue" | "expense";

  @ApiPropertyOptional({ enum: ["pending", "confirmed", "cancelled", "reconciled"] })
  @IsEnum(["pending", "confirmed", "cancelled", "reconciled"])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: "2025-01-01" })
  @IsDateString()
  @IsOptional()
  date_from?: string;

  @ApiPropertyOptional({ example: "2025-01-31" })
  @IsDateString()
  @IsOptional()
  date_to?: string;

  @ApiPropertyOptional({ default: 1 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 50;
}
