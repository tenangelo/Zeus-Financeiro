import { PartialType } from "@nestjs/swagger";
import { CreateRecipeDto } from "./create-recipe.dto";
import { IsBoolean, IsOptional, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { RecipeItemDto } from "./create-recipe.dto";

export class UpdateRecipeDto extends PartialType(CreateRecipeDto) {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  // Ao atualizar items, substitui todos (replace semantics)
  @ApiPropertyOptional({
    type: [RecipeItemDto],
    description: "Substitui todos os itens da ficha técnica. Omitir para não alterar.",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeItemDto)
  @IsOptional()
  override items?: RecipeItemDto[];
}
