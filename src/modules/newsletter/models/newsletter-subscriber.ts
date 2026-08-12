import { model } from "@medusajs/framework/utils"

export const NewsletterSubscriber = model.define("newsletter_subscriber", {
  id: model.id({ prefix: "nlsub" }).primaryKey(),
  email: model.text().unique(),
  // where the signup came from, e.g. "storefront"
  source: model.text().nullable(),
  unsubscribed_at: model.dateTime().nullable(),
})
