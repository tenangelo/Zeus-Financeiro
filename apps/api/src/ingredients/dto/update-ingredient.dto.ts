import { PartialType } from "@nestjs/swagger";
import { CreateIngredientDto } from "./create-ingredient.dto";
import { IsBoolean, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateIngredientDto extends PartialType(CreateIngredientDto) {
  @ApiPropertyOptional({ description: "Desativar ingrediente (soft delete)" })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
