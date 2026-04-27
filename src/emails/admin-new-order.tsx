import {
    Body, Container, Head, Heading, Hr, Html,
    Preview, Row, Column, Section, Text
} from "@react-email/components"

type OrderItem = {
    title: string
    quantity: number
    unit_price: number
}

type AdminNewOrderEmailProps = {
    orderDisplayId: string
    customerName: string
    customerEmail: string
    items: OrderItem[]
    total: number
    shippingAddress: string
}

export default function AdminNewOrderEmail({
    orderDisplayId,
    customerName,
    customerEmail,
    items,
    total,
    shippingAddress,
}: AdminNewOrderEmailProps) {
    return (
        <Html>
            <Head />
            <Preview>🛒 New order #{orderDisplayId} from {customerName}</Preview>
            <Body style={{ backgroundColor: "#F9F6EE", fontFamily: "DM Sans, sans-serif" }}>
                <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "32px 16px" }}>

                    {/* Header */}
                    <Heading style={{ color: "#006b2f", fontFamily: "Georgia, serif", fontSize: "24px" }}>
                        New Order Received
                    </Heading>
                    <Hr style={{ borderColor: "#FFCC00", borderWidth: "2px" }} />

                    {/* Order meta */}
                    <Text style={{ fontSize: "13px", color: "#006b2f", fontFamily: "monospace", textTransform: "uppercase" }}>
                        Order #{orderDisplayId}
                    </Text>

                    {/* Customer info */}
                    <Section style={{ backgroundColor: "#ffffff", border: "1px solid #D8E8D0", borderRadius: "8px", padding: "16px", marginTop: "8px" }}>
                        <Text style={{ fontSize: "13px", color: "#006b2f", fontFamily: "monospace", textTransform: "uppercase", margin: "0 0 8px" }}>
                            Customer
                        </Text>
                        <Text style={{ fontSize: "14px", color: "#1a1a1a", margin: "0" }}>
                            {customerName}
                        </Text>
                        <Text style={{ fontSize: "14px", color: "#555555", margin: "4px 0 0" }}>
                            {customerEmail}
                        </Text>
                    </Section>

                    {/* Items */}
                    <Section style={{ backgroundColor: "#ffffff", border: "1px solid #D8E8D0", borderRadius: "8px", padding: "16px", marginTop: "12px" }}>
                        <Text style={{ fontSize: "13px", color: "#006b2f", fontFamily: "monospace", textTransform: "uppercase", margin: "0 0 12px" }}>
                            Items
                        </Text>
                        {items.map((item, i) => (
                            <Row key={i} style={{ marginBottom: "8px" }}>
                                <Column style={{ fontSize: "14px", color: "#1a1a1a" }}>
                                    {item.title} × {item.quantity}
                                </Column>
                                <Column style={{ fontSize: "14px", color: "#1a1a1a", textAlign: "right" }}>
                                    ₦{((item.unit_price * item.quantity)).toLocaleString()}
                                </Column>
                            </Row>
                        ))}
                        <Hr style={{ borderColor: "#D8E8D0" }} />
                        <Row>
                            <Column style={{ fontWeight: "bold", fontSize: "15px" }}>Total</Column>
                            <Column style={{ fontWeight: "bold", fontSize: "15px", textAlign: "right" }}>
                                ₦{(total).toLocaleString()}
                            </Column>
                        </Row>
                    </Section>

                    {/* Delivery address */}
                    <Section style={{ marginTop: "16px" }}>
                        <Text style={{ fontSize: "13px", color: "#006b2f", fontFamily: "monospace", textTransform: "uppercase" }}>
                            Deliver to
                        </Text>
                        <Text style={{ fontSize: "14px", color: "#1a1a1a", marginTop: "4px" }}>
                            {shippingAddress}
                        </Text>
                    </Section>

                    <Hr style={{ borderColor: "#D8E8D0", marginTop: "32px" }} />
                    <Text style={{ fontSize: "12px", color: "#888888", textAlign: "center" }}>
                        Abundish Admin Alerts · abundish.info
                    </Text>

                </Container>
            </Body>
        </Html>
    )
}