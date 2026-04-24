import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import multipart from "@fastify/multipart";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env.NODE_ENV !== "production" })
  );

  // Fastify multipart para upload de arquivos CSV/Excel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(multipart as any, { limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB

  // Prefixo global da API + versionamento
  app.setGlobalPrefix("api");
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });

  // Validação automática de DTOs via class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // remove campos não declarados no DTO
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  // CORS — aceita lista de origins separadas por vírgula via ALLOWED_ORIGINS
  // Ex: ALLOWED_ORIGINS=https://app.vercel.app,https://railway.app,http://localhost:3000
  const rawOrigins = process.env.ALLOWED_ORIGINS ?? process.env.FRONTEND_URL ?? "http://localhost:3000";
  const allowedOrigins = rawOrigins.split(",").map((o) => o.trim()).filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (ex: curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      const allowed = allowedOrigins.some((o) => {
        if (o.includes("*")) {
          return new RegExp("^" + o.replace(/\*/g, ".*") + "$").test(origin);
        }
        return o === origin;
      });
      callback(allowed ? null : new Error("CORS: origem não permitida"), allowed);
    },
    credentials: true,
  });

  // Swagger (desabilitar em produção se necessário)
  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("Zeus Financeiro API")
      .setDescription("API do Agente Financeiro de IA para Restaurantes")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
  }

  const port = parseInt(process.env.PORT ?? "3001", 10);
  await app.listen(port, "0.0.0.0");
  console.log(`Zeus API rodando em http://localhost:${port}/api/v1`);
  console.log(`Swagger disponível em http://localhost:${port}/api/docs`);
}

bootstrap().catch(console.error);
