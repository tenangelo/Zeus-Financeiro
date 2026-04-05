import { Module } from "@nestjs/common";
import { RecipesService } from "./recipes.service";
import { RecipesController } from "./recipes.controller";
import { AuthModule } from "../auth/auth.module";
import { IngredientsModule } from "../ingredients/ingredients.module";

@Module({
  imports: [AuthModule, IngredientsModule],
  providers: [RecipesService],
  controllers: [RecipesController],
  exports: [RecipesService],
})
export class RecipesModule {}
