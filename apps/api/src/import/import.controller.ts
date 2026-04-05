import {
  Controller, Post, Get,
  UseGuards, Request, Version,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags,
} from "@nestjs/swagger";
import { ImportService, ColumnMapping } from "./import.service";
import { AuthGuard } from "../auth/auth.guard";
import { TenantGuard } from "../auth/tenant.guard";
import type { AuthenticatedRequest } from "../auth/auth.guard";
import type { FastifyRequest } from "fastify";
import type { MultipartFile } from "@fastify/multipart";

/**
 * Upload via Fastify multipart (sem Express/Multer).
 * Usa o parser nativo do @fastify/multipart registrado no main.ts.
 */
@ApiTags("Import")
@ApiBearerAuth()
@UseGuards(AuthGuard, TenantGuard)
@Controller("import")
export class ImportController {
  constructor(private readonly service: ImportService) {}

  /**
   * Extrai o buffer e nome do arquivo de um request multipart Fastify.
   */
  private async getFile(req: FastifyRequest): Promise<{ buffer: Buffer; filename: string }> {
    const data = await (req as any).file() as MultipartFile | undefined;
    if (!data) throw new BadRequestException("Nenhum arquivo enviado.");

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    return { buffer: Buffer.concat(chunks), filename: data.filename };
  }

  @Post("detect-columns")
  @Version("1")
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Detectar colunas do CSV/Excel antes de importar" })
  @ApiBody({ schema: { type: "object", properties: { file: { type: "string", format: "binary" } } } })
  async detectColumns(@Request() req: AuthenticatedRequest) {
    const { buffer, filename } = await this.getFile(req);
    return { columns: this.service.detectColumns(buffer, filename) };
  }

  @Post("upload")
  @Version("1")
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Importar CSV/Excel em lote" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        type:  { type: "string", enum: ["transactions", "ingredients", "stock_movements"] },
      },
    },
  })
  async upload(@Request() req: AuthenticatedRequest) {
    // Em Fastify multipart, precisamos acessar todos os fields do form
    const parts = (req as any).parts() as AsyncIterable<any>;
    let fileBuffer: Buffer | null = null;
    let filename = "upload";
    let importType = "transactions";

    for await (const part of parts) {
      if (part.type === "file") {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) chunks.push(chunk);
        fileBuffer = Buffer.concat(chunks);
        filename = part.filename;
      } else if (part.fieldname === "type") {
        importType = part.value as string;
      }
    }

    if (!fileBuffer) throw new BadRequestException("Nenhum arquivo enviado.");

    const mapping = this.service.buildDefaultMapping(importType);

    if (importType === "transactions") {
      return this.service.importTransactions(
        req.tenantId, req.user.sub, fileBuffer, filename, mapping,
      );
    }
    if (importType === "ingredients") {
      return this.service.importIngredients(
        req.tenantId, req.user.sub, fileBuffer, filename,
      );
    }
    throw new BadRequestException(`Tipo de importação desconhecido: ${importType}`);
  }

  @Get("jobs")
  @Version("1")
  @ApiOperation({ summary: "Listar jobs de importação do tenant" })
  listJobs() {
    return { message: "Em breve: listagem de jobs de importação." };
  }
}
