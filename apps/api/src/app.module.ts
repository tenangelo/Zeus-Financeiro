import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { SupabaseModule } from "./supabase/supabase.module";
import { AuthModule } from "./auth/auth.module";
import { CmvModule } from "./cmv/cmv.module";
import { IngredientsModule } from "./ingredients/ingredients.module";
import { RecipesModule } from "./recipes/recipes.module";
import { StockModule } from "./stock/stock.module";
import { TransactionsModule } from "./transactions/transactions.module";
import { ImportModule } from "./import/import.module";
import { AppController } from "./app.controller";

@Module({
  imports: [
    // Variáveis de ambiente disponíveis em todo o app
    ConfigModule.forRoot({ isGlobal: true, envFilePath: "../../.env" }),

    // Rate limiting: 100 requisições por minuto por IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // Cron jobs (análises noturnas da IA)
    ScheduleModule.forRoot(),

    // Módulos de negócio
    SupabaseModule,
    AuthModule,
    IngredientsModule,
    RecipesModule,
    StockModule,
    CmvModule,
    TransactionsModule,
    ImportModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
