import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString, IsOptional, IsBoolean, IsObject, MinLength, MaxLength, Matches,
} from "class-validator";

export class UpdateTenantDto {
  @ApiPropertyOptional({ example: "Restaurante do João" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @ApiPropertyOptional({ example: "+5511999887766" })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, { message: "Formato inválido. Use +55119..." })
  whatsapp_number?: string;

  @ApiPropertyOptional({
    description: "Configurações do tenant",
    example: { cmv_alert_threshold_pct: 35, timezone: "America/Sao_Paulo" },
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
