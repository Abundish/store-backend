// src/subscribers/order-placed.ts
import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { BigNumber } from "@medusajs/framework/utils"
import { render } from "@react-email/components"
import { resend } from "../lib/resend"
import OrderPlacedEmail from "../emails/order-placed"
import AdminNewOrderEmail from "../emails/admin-new-order"

function toAmount(value: unknown): number {
    if (value == null) return 0
    if (value instanceof BigNumber) return value.numeric
    if (typeof value === "number") return value
    const parsed = parseFloat(String(value))
    return Number.isNaN(parsed) ? 0 : parsed
}

export default async function orderPlacedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const query = container.resolve("query")

    const { data: orders } = await query.graph({
        entity: "order",
        fields: [
            "display_id",
            "email",
            "total",
            "items.title",
            "items.quantity",
            "items.total",
            "shipping_address.*",
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
        .map((item) => ({
            title: item.title,
            quantity: item.quantity,
            line_total: toAmount(item.total),
        }))

    const orderTotal = toAmount(order.total)

    // --- Customer email ---
    const customerHtml = await render(
        OrderPlacedEmail({
            customerName,
            orderDisplayId: String(order.display_id),
            items: itemsPayload,
            total: orderTotal,
            shippingAddress,
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
            shippingAddress,
        })
    )

    await resend.emails.send({
        from: "Abundish <orders@abundish.info>",
        to: process.env.ADMIN_NOTIFICATION_EMAIL!,
        subject: `🛒 New order #${order.display_id} — ₦${orderTotal.toLocaleString()}`,
        replyTo: order.email ?? undefined,
        html: adminHtml,
    })
}

export const config: SubscriberConfig = {
    event: "order.placed",
}