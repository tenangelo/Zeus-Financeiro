import {
  IsUUID,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export const MOVEMENT_TYPES = [
  "purchase",
  "consumption",
  "waste",
  "adjustment",
  "return",
] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number];

export class CreateMovementDto {
  @ApiProperty({ description: "UUID do ingrediente" })
  @IsUUID()
  ingredient_id: string;

  @ApiProperty({ enum: MOVEMENT_TYPES, example: "purchase" })
  @IsEnum(MOVEMENT_TYPES)
  movement_type: MovementType;

  @ApiProperty({ example: 5.0, description: "Quantidade na unidade do ingrediente" })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  quantity: number;

  @ApiPropertyOptional({ example: 8.5, description: "Custo unitário (obrigatório para purchase)" })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @IsOptional()
  unit_cost?: number;

  @ApiPropertyOptional({ description: "UUID do fornecedor (para purchase/return)" })
  @IsUUID()
  @IsOptional()
  supplier_id?: string;

  @ApiPropertyOptional({ description: "ID de referência (nota fiscal, venda, etc)" })
  @IsUUID()
  @IsOptional()
  reference_id?: string;

  @ApiPropertyOptional({ example: "manual", description: "Tipo da referência" })
  @IsString()
  @IsOptional()
  reference_type?: string;

  @ApiPropertyOptional({ example: "Ajuste de inventário mensal" })
  @IsString()
  @IsOptional()
  notes?: string;
}
