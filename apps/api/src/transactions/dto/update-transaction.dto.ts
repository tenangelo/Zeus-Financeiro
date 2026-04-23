import {
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
  MaxLength,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateTransactionDto {
  @ApiPropertyOptional({ enum: ["revenue", "expense"] })
  @IsEnum(["revenue", "expense"])
  @IsOptional()
  type?: "revenue" | "expense";

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  transaction_date?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  due_date?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;


}
