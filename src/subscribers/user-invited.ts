import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { render } from "@react-email/components"
import { resend } from "../lib/resend"
import UserInvitedEmail from "../emails/user-invited"

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "Abundish <orders@abundish.info>"

export default async function userInvitedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve("query")
  const config = container.resolve("configModule")

  const { data: invites } = await query.graph({
    entity: "invite",
    fields: ["email", "token"],
    filters: {
      id: data.id,
    },
  })

  const invite = invites?.[0]
  if (!invite?.email || !invite?.token) {
    return
  }

  const backendUrl =
    config.admin.backendUrl && config.admin.backendUrl !== "/"
      ? config.admin.backendUrl
      : "http://localhost:9000"
  const adminPath = config.admin.path ?? "/app"
  const inviteUrl = `${backendUrl}${adminPath}/invite?token=${invite.token}`

  const html = await render(
    UserInvitedEmail({
      inviteUrl,
      email: invite.email,
    })
  )

  await resend.emails.send({
    from: FROM_EMAIL,
    to: invite.email,
    subject: "You've been invited to Abundish Admin",
    html,
  })
}

export const config: SubscriberConfig = {
  event: ["invite.created", "invite.resent"],
}
