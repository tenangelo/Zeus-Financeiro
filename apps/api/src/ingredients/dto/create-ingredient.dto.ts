import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsDateString,
  IsUUID,
  Min,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export const INGREDIENT_UNITS = ["kg", "g", "l", "ml", "un", "cx", "pct"] as const;
export type IngredientUnit = (typeof INGREDIENT_UNITS)[number];

export class CreateIngredientDto {
  @ApiProperty({ example: "Tomate" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: "hortifruti" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @ApiProperty({ enum: INGREDIENT_UNITS, example: "kg" })
  @IsEnum(INGREDIENT_UNITS)
  unit: IngredientUnit;

  @ApiPropertyOptional({ example: 8.5, description: "Custo unitário em R$" })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @IsOptional()
  unit_cost?: number;

  @ApiPropertyOptional({ example: 10.0, description: "Quantidade atual em estoque" })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @IsOptional()
  stock_quantity?: number;

  @ApiPropertyOptional({ example: 2.0, description: "Estoque mínimo para alerta" })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @IsOptional()
  min_stock_alert?: number;

  @ApiPropertyOptional({ example: "2025-12-31" })
  @IsDateString()
  @IsOptional()
  expiry_date?: string;

  @ApiPropertyOptional({ description: "UUID do fornecedor preferencial" })
  @IsUUID()
  @IsOptional()
  preferred_supplier_id?: string;
}
