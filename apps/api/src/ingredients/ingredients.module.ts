import { Module } from "@nestjs/common";
import { IngredientsService } from "./ingredients.service";
import { IngredientsController } from "./ingredients.controller";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  providers: [IngredientsService],
  controllers: [IngredientsController],
  exports: [IngredientsService],
})
export class IngredientsModule {}
