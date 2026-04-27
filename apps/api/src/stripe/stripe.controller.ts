import {
  Controller, Post, Body, Req, Headers, RawBodyRequest,
  UseGuards, Version, BadRequestException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { StripeService } from "./stripe.service";
import { AuthGuard } from "../auth/auth.guard";
import { TenantGuard } from "../auth/tenant.guard";
import type { AuthenticatedRequest } from "../auth/auth.guard";
import type { FastifyRequest } from "fastify";
import { IsString, IsOptional } from "class-validator";

class CreateCheckoutDto {
  @IsString() price_id: string;
  @IsOptional() @IsString() success_url?: string;
  @IsOptional() @IsString() cancel_url?: string;
}

@ApiTags("Billing")
@Controller("billing")
export class StripeController {
  constructor(private readonly stripe: StripeService) {}

  @Post("checkout")
  @Version("1")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, TenantGuard)
  @ApiOperation({ summary: "Criar sessão de checkout Stripe" })
  async createCheckout(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCheckoutDto,
  ) {
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL ?? "http://localhost:3000";
    const url = await this.stripe.createCheckoutSession(
      req.tenantId,
      req.user.email,
      "Zeus Restaurante",
      dto.price_id,
      dto.success_url ?? `${frontendUrl}/dashboard/settings?payment=success`,
      dto.cancel_url ?? `${frontendUrl}/dashboard/settings?payment=cancel`,
    );
    return { url };
  }

  @Post("portal")
  @Version("1")
  @ApiBearerAuth()
  @UseGuards(AuthGuard, TenantGuard)
  @ApiOperation({ summary: "Abrir portal de gerenciamento de assinatura Stripe" })
  async openPortal(@Req() req: AuthenticatedRequest) {
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL ?? "http://localhost:3000";
    const url = await this.stripe.createBillingPortalSession(
      req.tenantId,
      `${frontendUrl}/dashboard/settings`,
    );
    return { url };
  }

  @Post("webhook")
  @Version("1")
  @ApiOperation({ summary: "Webhook Stripe (não autenticado — verificado por assinatura)" })
  async handleWebhook(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Headers("stripe-signature") signature: string,
  ) {
    if (!signature) throw new BadRequestException("Stripe-Signature ausente.");

    const rawBody = (req as any).rawBody ?? req.body;
    if (!rawBody) throw new BadRequestException("Body vazio.");

    let event;
    try {
      event = this.stripe.constructEvent(
        Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody as string),
        signature,
      );
    } catch {
      throw new BadRequestException("Assinatura do webhook inválida.");
    }

    await this.stripe.handleWebhookEvent(event);
    return { received: true };
  }
}
