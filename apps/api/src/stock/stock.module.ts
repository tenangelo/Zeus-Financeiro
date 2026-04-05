import { Module } from "@nestjs/common";
import { StockService } from "./stock.service";
import { StockController } from "./stock.controller";
import { AuthModule } from "../auth/auth.module";
import { IngredientsModule } from "../ingredients/ingredients.module";

@Module({
  imports: [AuthModule, IngredientsModule],
  providers: [StockService],
  controllers: [StockController],
  exports: [StockService],
})
export class StockModule {}
