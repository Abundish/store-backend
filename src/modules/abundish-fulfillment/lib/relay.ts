export type RelayFeeQuoteRequest = {
  source_address_string: string
  destination_address_string: string
  estimated_order_amount?: number
}

export type RelayFeeQuote = {
  id: number
  total_amount: number
  service_amount: number
  delivery_amount: number
  safety_fee: number
}

type RelayApiResponse<T> = {
  status: string
  message?: string
  data?: T
}

export type RelayClientOptions = {
  apiKey: string
  merchantRef: string
  baseUrl?: string
}

const DEFAULT_BASE_URL = "https://api.chowdeck.com"

/**
 * Thin client for Chowdeck merchant delivery fee quotes.
 * POST /merchant/{merchant_ref}/delivery/fee
 */
export class RelayClient {
  private apiKey: string
  private merchantRef: string
  private baseUrl: string

  constructor(options: RelayClientOptions) {
    this.apiKey = options.apiKey
    this.merchantRef = options.merchantRef.replace(/^\/+|\/+$/g, "")
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "")
  }

  async getDeliveryFee(body: RelayFeeQuoteRequest): Promise<RelayFeeQuote> {
    if (!body.source_address_string || !body.destination_address_string) {
      throw new Error(
        "Chowdeck fee quote requires source_address_string and destination_address_string"
      )
    }

    const response = await fetch(
      `${this.baseUrl}/merchant/${this.merchantRef}/delivery/fee`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          source_address_string: body.source_address_string,
          destination_address_string: body.destination_address_string,
          estimated_order_amount: body.estimated_order_amount ?? 0,
        }),
      }
    )

    const payload = (await response.json().catch(() => null)) as
      | RelayApiResponse<RelayFeeQuote>
      | null

    if (!response.ok || payload?.status !== "success" || !payload.data) {
      const message =
        payload?.message ||
        `Chowdeck fee quote failed with status ${response.status}`
      throw new Error(message)
    }

    return payload.data
  }
}
