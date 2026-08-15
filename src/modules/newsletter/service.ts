import { MedusaService } from "@medusajs/framework/utils"
import { NewsletterSubscriber } from "./models/newsletter-subscriber"

class NewsletterModuleService extends MedusaService({
  NewsletterSubscriber,
}) {
  /**
   * Idempotently subscribes an email. Re-subscribing an existing
   * (or previously unsubscribed) email never throws.
   */
  async subscribe(email: string, source?: string) {
    const normalized = email.trim().toLowerCase()

    const [existing] = await this.listNewsletterSubscribers({
      email: normalized,
    })

    if (existing) {
      if (existing.unsubscribed_at) {
        return await this.updateNewsletterSubscribers({
          id: existing.id,
          unsubscribed_at: null,
        })
      }
      return existing
    }

    return await this.createNewsletterSubscribers({
      email: normalized,
      source: source ?? null,
    })
  }
}

export default NewsletterModuleService
