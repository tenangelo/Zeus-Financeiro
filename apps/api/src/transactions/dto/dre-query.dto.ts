import { IsDateString, IsOptional } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class DreQueryDto {
  @ApiPropertyOptional({ example: "2026-04-01" })
  @IsDateString()
  @IsOptional()
  date_from?: string;

  @ApiPropertyOptional({ example: "2026-04-30" })
  @IsDateString()
  @IsOptional()
  date_to?: string;
}
