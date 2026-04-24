import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

const START_TIME = Date.now();

@ApiTags("Health")
@Controller()
export class AppController {
  @Get("health")
  @ApiOperation({ summary: "Health check" })
  health() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - START_TIME) / 1000),
      version: process.env.npm_package_version ?? "unknown",
      environment: process.env.NODE_ENV ?? "development",
    };
  }
}
