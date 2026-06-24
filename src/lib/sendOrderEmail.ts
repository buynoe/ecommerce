import { prisma } from "@/lib/prisma";
import {
  sendEmail,
  orderConfirmedEmail,
  orderShippedEmail,
  orderDeliveredEmail,
  orderCancelledEmail,
  returnApprovedEmail,
  welcomeEmail,
} from "@/lib/email";
import { formatCurrency } from "@/lib/utils";
import { getPlatformEmail, SmtpConfig } from "@/lib/platform";

type EmailEvent =
  | "orderConfirmed"
  | "orderShipped"
  | "orderDelivered"
  | "orderCancelled"
  | "returnApproved"
  | "welcomeEmail";

async function getStoreEmailConfig(storeId: string) {
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return null;

  let emailSettings: Record<string, boolean | string | number> = {};
  try { emailSettings = JSON.parse(store.emailSettings || "{}"); } catch { /* ignore */ }

  // Build smtp from store's own email settings
  let smtp: SmtpConfig | undefined;
  const provider = emailSettings.provider as string | undefined;

  if (provider === "sendgrid" && emailSettings.sendgridApiKey) {
    smtp = {
      host: "smtp.sendgrid.net",
      port: 587,
      user: "apikey",
      pass: emailSettings.sendgridApiKey as string,
      from: (emailSettings.sendgridFrom as string) || (emailSettings.from as string) || `"${store.name}" <noreply@buynoe.com>`,
    };
  } else if (provider === "smtp" || (!provider && emailSettings.host)) {
    smtp = {
      host: emailSettings.host as string,
      port: (emailSettings.port as number) || 587,
      user: emailSettings.user as string,
      pass: emailSettings.pass as string,
      from: (emailSettings.from as string) || `"${store.name}" <${emailSettings.user}>`,
    };
  }

  // Fall back to platform email if store has no config
  if (!smtp?.host || !smtp?.user || !smtp?.pass) {
    const platform = await getPlatformEmail();
    smtp = platform.smtp;
  }

  return { settings: emailSettings, storeName: store.name, smtp };
}

function isEventEnabled(settings: Record<string, boolean | string | number>, event: EmailEvent): boolean {
  // If setting is not defined, default to true (enabled)
  return settings[event] !== false;
}

export async function sendOrderConfirmedEmail(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: { select: { firstName: true } } },
    });
    if (!order) return;

    const config = await getStoreEmailConfig(order.storeId);
    if (!config) return;
    if (!isEventEnabled(config.settings, "orderConfirmed")) return;

    const firstName = order.customer?.firstName || order.email.split("@")[0];
    const html = orderConfirmedEmail(
      config.storeName, order.orderNumber, firstName,
      formatCurrency(order.total, order.currency)
    );
    await sendEmail({ to: order.email, subject: `Order Confirmed — #${order.orderNumber}`, html }, config.smtp);
  } catch (err) {
    console.error("[email] sendOrderConfirmedEmail:", err);
  }
}

export async function sendOrderShippedEmail(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { firstName: true } },
        shipments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!order) return;

    const config = await getStoreEmailConfig(order.storeId);
    if (!config) return;
    if (!isEventEnabled(config.settings, "orderShipped")) return;

    const firstName = order.customer?.firstName || order.email.split("@")[0];
    const shipment = order.shipments?.[0];
    const html = orderShippedEmail(
      config.storeName, order.orderNumber, firstName,
      shipment?.trackingNumber ?? undefined,
      shipment?.trackingUrl ?? undefined,
      shipment?.courierName ?? shipment?.provider ?? undefined,
    );
    await sendEmail({ to: order.email, subject: `Your Order #${order.orderNumber} has Shipped!`, html }, config.smtp);
  } catch (err) {
    console.error("[email] sendOrderShippedEmail:", err);
  }
}

export async function sendOrderDeliveredEmail(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: { select: { firstName: true } } },
    });
    if (!order) return;

    const config = await getStoreEmailConfig(order.storeId);
    if (!config) return;
    if (!isEventEnabled(config.settings, "orderDelivered")) return;

    const firstName = order.customer?.firstName || order.email.split("@")[0];
    const html = orderDeliveredEmail(config.storeName, order.orderNumber, firstName);
    await sendEmail({ to: order.email, subject: `Order #${order.orderNumber} Delivered`, html }, config.smtp);
  } catch (err) {
    console.error("[email] sendOrderDeliveredEmail:", err);
  }
}

export async function sendOrderCancelledEmail(orderId: string, reason?: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: { select: { firstName: true } } },
    });
    if (!order) return;

    const config = await getStoreEmailConfig(order.storeId);
    if (!config) return;
    if (!isEventEnabled(config.settings, "orderCancelled")) return;

    const firstName = order.customer?.firstName || order.email.split("@")[0];
    const html = orderCancelledEmail(config.storeName, order.orderNumber, firstName, reason);
    await sendEmail({ to: order.email, subject: `Order #${order.orderNumber} Cancelled`, html }, config.smtp);
  } catch (err) {
    console.error("[email] sendOrderCancelledEmail:", err);
  }
}

export async function sendReturnApprovedEmail(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: { select: { firstName: true } } },
    });
    if (!order) return;

    const config = await getStoreEmailConfig(order.storeId);
    if (!config) return;
    if (!isEventEnabled(config.settings, "returnApproved")) return;

    const firstName = order.customer?.firstName || order.email.split("@")[0];
    const html = returnApprovedEmail(config.storeName, order.orderNumber, firstName);
    await sendEmail({ to: order.email, subject: `Return Approved — #${order.orderNumber}`, html }, config.smtp);
  } catch (err) {
    console.error("[email] sendReturnApprovedEmail:", err);
  }
}

export async function sendWelcomeEmail(storeId: string, email: string, firstName: string) {
  try {
    const config = await getStoreEmailConfig(storeId);
    if (!config) return;
    if (!isEventEnabled(config.settings, "welcomeEmail")) return;

    const html = welcomeEmail(config.storeName, firstName);
    await sendEmail({ to: email, subject: `Welcome to ${config.storeName}!`, html }, config.smtp);
  } catch (err) {
    console.error("[email] sendWelcomeEmail:", err);
  }
}
