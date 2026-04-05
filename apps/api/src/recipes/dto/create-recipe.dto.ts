import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
  Min,
  Max,
  MaxLength,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RecipeItemDto {
  @ApiProperty({ description: "UUID do ingrediente" })
  @IsUUID()
  ingredient_id: string;

  @ApiProperty({ example: 0.2, description: "Quantidade utilizada na unidade do ingrediente" })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  quantity: number;

  @ApiPropertyOptional({
    example: 10,
    description: "Percentual de perda no preparo (0-100). Ex: 10 = 10% de desperdício",
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  @IsOptional()
  waste_factor_pct?: number;

  @ApiPropertyOptional({ example: "Cortar em cubos" })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateRecipeDto {
  @ApiProperty({ example: "Salada Caprese" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: "entradas" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ example: "Salada fresca com tomate e mozzarella" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 32.9, description: "Preço de venda em R$" })
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  sale_price: number;

  @ApiPropertyOptional({ example: 300, description: "Tamanho da porção em gramas" })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  serving_size?: number;

  @ApiPropertyOptional({ example: 15, description: "Tempo de preparo em minutos" })
  @IsNumber()
  @Min(0)
  @IsOptional()
  preparation_time_min?: number;

  @ApiProperty({
    type: [RecipeItemDto],
    description: "Ingredientes da ficha técnica",
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  items: RecipeItemDto[];
}
