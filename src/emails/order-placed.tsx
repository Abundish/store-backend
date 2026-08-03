import {
    Body, Container, Head, Heading, Hr, Html,
    Preview, Row, Column, Section, Text
  } from "@react-email/components"
  
  type OrderItem = {
    title: string
    quantity: number
    line_total: number
  }
  
  type OrderPlacedEmailProps = {
    customerName: string
    orderDisplayId: string
    items: OrderItem[]
    shippingFee: number
    total: number
    shippingAddress: string
    isPickup: boolean
  }
  
  export default function OrderPlacedEmail({
    customerName,
    orderDisplayId,
    items,
    shippingFee,
    total,
    shippingAddress,
    isPickup,
  }: OrderPlacedEmailProps) {
    return (
      <Html>
        <Head />
        <Preview>Your Abundish order #{orderDisplayId} has been received!</Preview>
        <Body style={{ backgroundColor: "#F9F6EE", fontFamily: "DM Sans, sans-serif" }}>
          <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "32px 16px" }}>
  
            {/* Header */}
            <Heading style={{ color: "#006b2f", fontFamily: "Georgia, serif", fontSize: "28px" }}>
              Abundish
            </Heading>
            <Hr style={{ borderColor: "#FFCC00", borderWidth: "2px" }} />
  
            {/* Greeting */}
            <Text style={{ fontSize: "16px", color: "#1a1a1a" }}>
              Hi {customerName},
            </Text>
            <Text style={{ fontSize: "16px", color: "#1a1a1a" }}>
              Thanks for your order! We&apos;ve received it and will get it ready for {isPickup ? "pickup" : "delivery"}.
            </Text>
  
            {/* Order ID */}
            <Text style={{ fontSize: "13px", color: "#006b2f", fontFamily: "monospace", textTransform: "uppercase" }}>
              Order #{orderDisplayId}
            </Text>
  
            {/* Items */}
            <Section style={{ backgroundColor: "#ffffff", border: "1px solid #D8E8D0", borderRadius: "8px", padding: "16px", marginTop: "16px" }}>
              {items.map((item, i) => (
                <Row key={i} style={{ marginBottom: "8px" }}>
                  <Column style={{ fontSize: "14px", color: "#1a1a1a" }}>
                    {item.title} × {item.quantity}
                  </Column>
                  <Column style={{ fontSize: "14px", color: "#1a1a1a", textAlign: "right" }}>
                    ₦{item.line_total.toLocaleString()}
                  </Column>
                </Row>
              ))}
              {shippingFee > 0 && (
                <Row style={{ marginBottom: "8px" }}>
                  <Column style={{ fontSize: "14px", color: "#555555" }}>
                    {isPickup ? "Pickup fee" : "Delivery fee"}
                  </Column>
                  <Column style={{ fontSize: "14px", color: "#555555", textAlign: "right" }}>
                    ₦{shippingFee.toLocaleString()}
                  </Column>
                </Row>
              )}
              <Hr style={{ borderColor: "#D8E8D0" }} />
              <Row>
                <Column style={{ fontWeight: "bold", fontSize: "15px" }}>Total</Column>
                <Column style={{ fontWeight: "bold", fontSize: "15px", textAlign: "right" }}>
                  ₦{total.toLocaleString()}
                </Column>
              </Row>
            </Section>
  
            {/* Address / pickup note */}
            <Section style={{ marginTop: "24px" }}>
              <Text style={{ fontSize: "13px", color: "#006b2f", fontFamily: "monospace", textTransform: "uppercase" }}>
                {isPickup ? "Pickup" : "Delivering to"}
              </Text>
              {isPickup ? (
                <Text style={{ fontSize: "14px", color: "#1a1a1a", marginTop: "4px" }}>
                  You have chosen to pick up your order. We&apos;ll be in touch with the pickup details.
                </Text>
              ) : (
                <Text style={{ fontSize: "14px", color: "#1a1a1a", marginTop: "4px" }}>
                  {shippingAddress}
                </Text>
              )}
            </Section>
  
            {/* Footer */}
            <Hr style={{ borderColor: "#D8E8D0", marginTop: "32px" }} />
            <Text style={{ fontSize: "12px", color: "#888888", textAlign: "center" }}>
              Abundish · Fresh from Nigerian farms to your table · Lagos
            </Text>
  
          </Container>
        </Body>
      </Html>
    )
  }