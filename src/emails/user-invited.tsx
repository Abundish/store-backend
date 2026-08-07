import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

type UserInvitedEmailProps = {
  inviteUrl: string
  email: string
}

export default function UserInvitedEmail({
  inviteUrl,
  email,
}: UserInvitedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You have been invited to join Abundish Admin</Preview>
      <Body style={{ backgroundColor: "#F9F6EE", fontFamily: "DM Sans, sans-serif" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "32px 16px" }}>
          <Section
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              padding: "32px",
              border: "1px solid #e5e5e5",
            }}
          >
            <Heading
              style={{
                color: "#1a1a1a",
                fontSize: "24px",
                fontWeight: 600,
                margin: "0 0 24px",
                textAlign: "center",
              }}
            >
              You&apos;re invited to Abundish Admin
            </Heading>

            <Text style={{ color: "#444", fontSize: "15px", lineHeight: "24px", margin: "0 0 16px" }}>
              Hello {email},
            </Text>

            <Text style={{ color: "#444", fontSize: "15px", lineHeight: "24px", margin: "0 0 24px" }}>
              You have been invited to join the Abundish admin dashboard. Click the button below to
              accept your invitation and set up your account.
            </Text>

            <Section style={{ textAlign: "center", margin: "32px 0" }}>
              <Button
                href={inviteUrl}
                style={{
                  backgroundColor: "#1a1a1a",
                  borderRadius: "6px",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 600,
                  padding: "12px 24px",
                  textDecoration: "none",
                }}
              >
                Accept Invitation
              </Button>
            </Section>

            <Text style={{ color: "#666", fontSize: "13px", lineHeight: "22px", margin: "0 0 8px" }}>
              Or copy and paste this link into your browser:
            </Text>

            <Link
              href={inviteUrl}
              style={{
                color: "#2563eb",
                fontSize: "13px",
                lineHeight: "22px",
                wordBreak: "break-all",
              }}
            >
              {inviteUrl}
            </Link>

            <Text style={{ color: "#999", fontSize: "12px", lineHeight: "20px", margin: "32px 0 0" }}>
              If you were not expecting this invitation, you can safely ignore this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
