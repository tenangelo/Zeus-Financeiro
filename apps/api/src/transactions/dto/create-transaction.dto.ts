import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
  IsUUID,
  Min,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export const TRANSACTION_TYPES = ["revenue", "expense"] as const;
export const TRANSACTION_STATUSES = ["pending", "confirmed", "cancelled", "reconciled"] as const;

export class CreateTransactionDto {
  @ApiProperty({ enum: TRANSACTION_TYPES, example: "expense" })
  @IsEnum(TRANSACTION_TYPES)
  type: "revenue" | "expense";

  @ApiProperty({ example: "Compra de insumos" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category: string;

  @ApiPropertyOptional({ example: "Tomate, alface e mozzarella" })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 450.0 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: "2025-01-15" })
  @IsDateString()
  transaction_date: string;

  @ApiPropertyOptional({ example: "2025-01-30", description: "Data de vencimento" })
  @IsDateString()
  @IsOptional()
  due_date?: string;

  @ApiPropertyOptional({ enum: TRANSACTION_STATUSES, default: "pending" })
  @IsEnum(TRANSACTION_STATUSES)
  @IsOptional()
  status?: "pending" | "confirmed" | "cancelled" | "reconciled";

  @ApiPropertyOptional({ description: "UUID do fornecedor (para despesas)" })
  @IsUUID()
  @IsOptional()
  supplier_id?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
