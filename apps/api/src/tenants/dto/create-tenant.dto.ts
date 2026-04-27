import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString, IsOptional, MinLength, MaxLength, Matches,
} from "class-validator";

export class CreateTenantDto {
  @ApiProperty({ example: "Cantina do João" })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @ApiProperty({ example: "cantina-do-joao", description: "Slug único: letras minúsculas, números e hífens" })
  @IsString()
  @Matches(/^[a-z0-9\-]+$/, { message: "Slug inválido. Use apenas letras minúsculas, números e hífens." })
  @MinLength(3)
  @MaxLength(80)
  slug: string;

  @ApiPropertyOptional({ example: "+5511999887766" })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, { message: "Formato inválido. Use +55119..." })
  whatsapp_number?: string;
}
