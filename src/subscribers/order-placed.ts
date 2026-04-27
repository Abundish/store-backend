// src/subscribers/order-placed.ts
import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { render } from "@react-email/components"
import { resend } from "../lib/resend"
import OrderPlacedEmail from "../emails/order-placed"
import AdminNewOrderEmail from "../emails/admin-new-order"

export default async function orderPlacedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const orderModuleService = container.resolve("order")

    const order = await orderModuleService.retrieveOrder(data.id, {
        relations: ["items", "shipping_address"],
    })
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
    const itemsPayload = (order.items ?? []).map((item) => ({
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
    }))

    // --- Customer email ---
    const customerHtml = await render(
        OrderPlacedEmail({
            customerName,
            orderDisplayId: String(order.display_id),
            items: itemsPayload,
            total: parseFloat(String(order.total)),
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
            total: parseFloat(String(order.total)),
            shippingAddress,
        })
    )

    await resend.emails.send({
        from: "Abundish <orders@abundish.info>",
        to: process.env.ADMIN_NOTIFICATION_EMAIL!,
        subject: `🛒 New order #${order.display_id} — ₦${(parseFloat(String(order.total))).toLocaleString()}`,
        replyTo: order.email ?? undefined,
        html: adminHtml,
    })
}

export const config: SubscriberConfig = {
    event: "order.placed",
}