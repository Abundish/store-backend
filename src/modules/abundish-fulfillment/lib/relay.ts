export type RelayCoordinates = {
  latitude: number
  longitude: number
}

export type RelayFeeQuoteRequest = {
  source_address?: RelayCoordinates
  destination_address?: RelayCoordinates
  source_address_string?: string
  destination_address_string?: string
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
  baseUrl?: string
}

const DEFAULT_BASE_URL = "https://api.relay.chowdeck.com"

/**
 * Thin client for Chowdeck Relay fee quotes.
 * Docs: https://chowdeck-api.readme.io/docs/creating-a-delivery
 */
export class RelayClient {
  private apiKey: string
  private baseUrl: string

  constructor(options: RelayClientOptions) {
    this.apiKey = options.apiKey
    this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "")
  }

  async getDeliveryFee(body: RelayFeeQuoteRequest): Promise<RelayFeeQuote> {
    const hasSource =
      Boolean(body.source_address) || Boolean(body.source_address_string)
    const hasDestination =
      Boolean(body.destination_address) ||
      Boolean(body.destination_address_string)

    if (!hasSource || !hasDestination) {
      throw new Error(
        "Relay fee quote requires source and destination (coordinates or address string)"
      )
    }

    const response = await fetch(`${this.baseUrl}/relay/delivery/fee`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    })

    const payload = (await response.json().catch(() => null)) as
      | RelayApiResponse<RelayFeeQuote>
      | null

    if (!response.ok || payload?.status !== "success" || !payload.data) {
      const message =
        payload?.message ||
        `Relay fee quote failed with status ${response.status}`
      throw new Error(message)
    }

    return payload.data
  }
}
