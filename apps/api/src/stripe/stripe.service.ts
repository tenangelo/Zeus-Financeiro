import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_SUPABASE_CLIENT } from "../supabase/supabase.module";
import type { Database } from "@zeus/database";

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(
    private readonly config: ConfigService,
    @Inject(ADMIN_SUPABASE_CLIENT)
    private readonly supabase: SupabaseClient<Database>,
  ) {
    this.stripe = new Stripe(config.getOrThrow<string>("STRIPE_SECRET_KEY"), {
      apiVersion: "2025-03-31.basil",
    });
  }

  get client(): Stripe {
    return this.stripe;
  }

  // ─── Customer ─────────────────────────────────────────────────────
  async getOrCreateCustomer(tenantId: string, email: string, name: string): Promise<string> {
    const { data: tenant } = await this.supabase
      .from("tenants")
      .select("stripe_customer_id")
      .eq("id", tenantId)
      .single();

    if (tenant?.stripe_customer_id) return tenant.stripe_customer_id;

    const customer = await this.stripe.customers.create({ email, name, metadata: { tenant_id: tenantId } });

    await this.supabase
      .from("tenants")
      .update({ stripe_customer_id: customer.id } as any)
      .eq("id", tenantId);

    return customer.id;
  }

  // ─── Subscription ─────────────────────────────────────────────────
  async createCheckoutSession(
    tenantId: string,
    email: string,
    tenantName: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<string> {
    const customerId = await this.getOrCreateCustomer(tenantId, email, tenantName);

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { tenant_id: tenantId },
      subscription_data: { metadata: { tenant_id: tenantId } },
      allow_promotion_codes: true,
      billing_address_collection: "required",
    });

    return session.url!;
  }

  async createBillingPortalSession(tenantId: string, returnUrl: string): Promise<string> {
    const { data: tenant } = await this.supabase
      .from("tenants")
      .select("stripe_customer_id")
      .eq("id", tenantId)
      .single();

    if (!tenant?.stripe_customer_id) throw new Error("Tenant sem customer Stripe.");

    const session = await this.stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: returnUrl,
    });

    return session.url;
  }

  // ─── Webhook Handler ──────────────────────────────────────────────
  constructEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.config.getOrThrow<string>("STRIPE_WEBHOOK_SECRET"),
    );
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    // Idempotency: log and skip duplicates
    const { data: existing } = await this.supabase
      .from("payment_events")
      .select("id, processed")
      .eq("stripe_event_id", event.id)
      .single();

    if (existing?.processed) return;

    let tenantId: string | null = null;

    try {
      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const sub = event.data.object as Stripe.Subscription;
          tenantId = sub.metadata?.tenant_id ?? null;
          if (tenantId) await this.syncSubscription(tenantId, sub);
          break;
        }
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          tenantId = sub.metadata?.tenant_id ?? null;
          if (tenantId) {
            await this.supabase
              .from("subscriptions")
              .update({ status: "canceled", canceled_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any)
              .eq("tenant_id", tenantId);
            await this.supabase.from("tenants").update({ plan_tier: "trial" } as any).eq("id", tenantId);
          }
          break;
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
          if (customerId) {
            const { data: tenant } = await this.supabase.from("tenants").select("id").eq("stripe_customer_id", customerId).single();
            if (tenant) {
              tenantId = tenant.id;
              await this.supabase.from("subscriptions").update({ status: "past_due", updated_at: new Date().toISOString() } as any).eq("tenant_id", tenant.id);
            }
          }
          break;
        }
        case "invoice.paid": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
          if (customerId) {
            const { data: tenant } = await this.supabase.from("tenants").select("id").eq("stripe_customer_id", customerId).single();
            if (tenant) {
              tenantId = tenant.id;
              await this.supabase.from("subscriptions").update({ status: "active", updated_at: new Date().toISOString() } as any).eq("tenant_id", tenant.id);
            }
          }
          break;
        }
      }

      await this.supabase.from("payment_events").upsert({
        stripe_event_id: event.id,
        event_type: event.type,
        payload: event as any,
        tenant_id: tenantId,
        processed: true,
        processed_at: new Date().toISOString(),
      }, { onConflict: "stripe_event_id" });

    } catch (err: any) {
      await this.supabase.from("payment_events").upsert({
        stripe_event_id: event.id,
        event_type: event.type,
        payload: event as any,
        tenant_id: tenantId,
        processed: false,
        error_message: err.message,
      }, { onConflict: "stripe_event_id" });
      throw err;
    }
  }

  private async syncSubscription(tenantId: string, stripeSub: Stripe.Subscription) {
    const priceId = stripeSub.items.data[0]?.price?.id;
    if (!priceId) return;

    const { data: plan } = await this.supabase
      .from("plans")
      .select("id, tier")
      .or(`stripe_price_id_monthly.eq.${priceId},stripe_price_id_yearly.eq.${priceId}`)
      .single();

    const interval = stripeSub.items.data[0]?.price?.recurring?.interval === "year" ? "yearly" : "monthly";
    const amount = (stripeSub.items.data[0]?.price?.unit_amount ?? 0) / 100;

    await this.supabase.from("subscriptions").upsert({
      tenant_id: tenantId,
      plan_id: plan?.id ?? null,
      stripe_subscription_id: stripeSub.id,
      stripe_customer_id: typeof stripeSub.customer === "string" ? stripeSub.customer : stripeSub.customer?.id,
      status: stripeSub.status as any,
      billing_interval: interval,
      current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: stripeSub.cancel_at_period_end,
      amount,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id" });

    if (plan?.tier) {
      await this.supabase.from("tenants").update({ plan_tier: plan.tier, stripe_subscription_id: stripeSub.id } as any).eq("id", tenantId);
    }
  }
}
