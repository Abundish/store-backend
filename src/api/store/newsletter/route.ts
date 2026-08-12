import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NEWSLETTER_MODULE } from "../../../modules/newsletter"
import NewsletterModuleService from "../../../modules/newsletter/service"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { email, source } = (req.body ?? {}) as {
    email?: string
    source?: string
  }

  if (!email || !EMAIL_REGEX.test(email.trim())) {
    res.status(400).json({ message: "A valid email is required" })
    return
  }

  const newsletterService = req.scope.resolve<NewsletterModuleService>(
    NEWSLETTER_MODULE
  )

  const subscriber = await newsletterService.subscribe(
    email,
    source ?? "storefront"
  )

  res.status(200).json({ subscriber: { id: subscriber.id, email: subscriber.email } })
}
