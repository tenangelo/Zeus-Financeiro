import { Module } from "@nestjs/common";
import { CmvService } from "./cmv.service";
import { CmvController } from "./cmv.controller";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  providers: [CmvService],
  controllers: [CmvController],
  exports: [CmvService],
})
export class CmvModule {}
