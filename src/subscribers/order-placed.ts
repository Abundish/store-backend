// src/subscribers/order-placed.ts
import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { BigNumber } from "@medusajs/framework/utils"
import { render } from "@react-email/components"
import { resend } from "../lib/resend"
import OrderPlacedEmail from "../emails/order-placed"
import AdminNewOrderEmail from "../emails/admin-new-order"

// query.graph may return BigNumber as a class instance or a plain object
// ({ numeric }, { numeric_ }, or { value }). Handle all of those forms.
function toAmount(value: unknown): number {
    if (value == null) return 0
    if (typeof value === "number") return value
    if (typeof value === "string") {
        const parsed = parseFloat(value)
        return Number.isNaN(parsed) ? 0 : parsed
    }
    if (value instanceof BigNumber) return value.numeric
    if (typeof value === "object") {
        const obj = value as Record<string, unknown>
        if (typeof obj.numeric === "number") return obj.numeric
        if (typeof obj.numeric_ === "number") return obj.numeric_
        if (obj.value != null) return toAmount(obj.value)
        if (obj.raw != null && typeof obj.raw === "object") {
            return toAmount((obj.raw as Record<string, unknown>).value)
        }
        if (obj.raw_ != null && typeof obj.raw_ === "object") {
            return toAmount((obj.raw_ as Record<string, unknown>).value)
        }
    }
    return 0
}

function parseEmailList(value: string | undefined): string[] {
    if (!value) return []
    return value
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean)
}

export default async function orderPlacedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const query = container.resolve("query")

    // items.* is required — requesting items.quantity alone does not reliably
    // load quantity from query.graph (Medusa #10403).
    const { data: orders } = await query.graph({
        entity: "order",
        fields: [
            "display_id",
            "email",
            "items.*",
            "shipping_address.*",
            "shipping_methods.name",
            "shipping_methods.amount",
        ],
        filters: {
            id: data.id,
        },
    })

    const order = orders[0]
    if (!order) return
    const customerName = order.shipping_address?.first_name ?? "there"

    const fullCustomerName = [
        order.shipping_address?.first_name,
        order.shipping_address?.last_name,
    ]
        .filter(Boolean)
        .join(" ") || customerName

    const shippingAddress = [
        order.shipping_address?.address_1,
        order.shipping_address?.city,
        order.shipping_address?.country_code?.toUpperCase(),
    ]
        .filter(Boolean)
        .join(", ")

    const itemsPayload = (order.items ?? [])
        .filter((item): item is NonNullable<typeof item> => item != null)
        .map((item) => {
            const qty = Math.max(1, Math.round(toAmount(item.quantity as unknown)))
            return {
                title: item.title,
                quantity: qty,
                line_total: toAmount(item.unit_price) * qty,
            }
        })

    const shippingMethods = (order.shipping_methods ?? []).filter(Boolean)

    const shippingFee = shippingMethods
        .reduce((sum: number, sm) => sum + toAmount(sm!.amount), 0)

    // Treat the order as a pickup if any shipping method name contains "pickup"
    // or "pick up" (case-insensitive).
    const isPickup = shippingMethods.some(sm =>
        /pick.?up|collect/i.test((sm as { name?: string }).name ?? "")
    )

    const subtotal = itemsPayload.reduce((sum, item) => sum + item.line_total, 0)
    const orderTotal = subtotal + shippingFee

    // --- Customer email ---
    const customerHtml = await render(
        OrderPlacedEmail({
            customerName,
            orderDisplayId: String(order.display_id),
            items: itemsPayload,
            total: orderTotal,
            shippingFee,
            shippingAddress,
            isPickup,
        })
    )

    if (order.email) {
        await resend.emails.send({
            from: "Abundish <orders@abundish.info>",
            to: order.email,
            subject: `Your Abundish order #${order.display_id} is confirmed`,
            html: customerHtml,
        })
    }

    // --- Admin alert ---
    const adminHtml = await render(
        AdminNewOrderEmail({
            orderDisplayId: String(order.display_id),
            customerName: fullCustomerName,
            customerEmail: order.email ?? "—",
            items: itemsPayload,
            total: orderTotal,
            shippingFee,
            shippingAddress,
            isPickup,
        })
    )

    const adminEmails = parseEmailList(process.env.ADMIN_NOTIFICATION_EMAIL)
    if (adminEmails.length) {
        await resend.emails.send({
            from: "Abundish <orders@abundish.info>",
            to: adminEmails,
            subject: `🛒 New order #${order.display_id} — ₦${orderTotal.toLocaleString()}`,
            replyTo: order.email ?? undefined,
            html: adminHtml,
        })
    }
}

export const config: SubscriberConfig = {
    event: "order.placed",
}