import { IsOptional, IsString, IsBoolean, IsInt, Min, Max } from "class-validator";
import { Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class QueryIngredientDto {
  @ApiPropertyOptional({ example: "tomate", description: "Busca por nome (case-insensitive)" })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: "hortifruti" })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: "Filtrar apenas com estoque abaixo do mínimo" })
  @Transform(({ value }) => value === "true")
  @IsBoolean()
  @IsOptional()
  low_stock?: boolean;

  @ApiPropertyOptional({ default: true })
  @Transform(({ value }) => value !== "false")
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 50;
}
