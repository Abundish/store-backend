// src/subscribers/order-placed.ts
import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { render } from "@react-email/components"
import { resend } from "../lib/resend"
import OrderPlacedEmail from "../emails/order-placed"

export default async function orderPlacedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const orderModuleService = container.resolve("order")

    const order = await orderModuleService.retrieveOrder(data.id, {
        relations: ["items", "shipping_address"],
    })

    const customerName = order.shipping_address?.first_name ?? "there"

    const shippingAddress = [
        order.shipping_address?.address_1,
        order.shipping_address?.city,
        order.shipping_address?.country_code?.toUpperCase(),
    ]
        .filter(Boolean)
        .join(", ")

    const html = await render(
        OrderPlacedEmail({
            customerName,
            orderDisplayId: String(order.display_id),
            items: (order.items ?? []).map((item) => ({
                title: item.title,
                quantity: item.quantity,
                unit_price: item.unit_price,
            })),
            total: Number(order.total),
            shippingAddress,
        })
    )

    const customerEmail = order.email

    if (!customerEmail) {
        console.warn(`[order-placed] No email found for order ${order.id}`)
        return
    }

    await resend.emails.send({
        from: "Abundish <orders@abundish.info>",
        to: customerEmail,
        subject: `Your Abundish order #${order.display_id} is confirmed`,
        html,
    })
}

export const config: SubscriberConfig = {
    event: "order.placed",
}