import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import {
  CalculateShippingOptionPriceDTO,
  FulfillmentOption,
  CreateFulfillmentResult,
  CreateShippingOptionDTO,
  Logger,
} from "@medusajs/framework/types"
import { Client } from "@googlemaps/google-maps-services-js"
import { RelayClient, RelayFeeQuote } from "./lib/relay"

type PricingTier = {
  minDistance: number
  maxDistance: number | null
  pricePerKm: number
  basePrice: number
  maxPrice: number | null
  description: string
}

type DistancePricingConfig = {
  centralLocation: { address: string; lat: number; lng: number }
  pricingTiers: PricingTier[]
  cacheDistanceResults: boolean
  cacheExpiryHours: number
}

type CacheEntry = { distance: number; timestamp: number }

type QuoteCacheEntry = { quote: RelayFeeQuote; timestamp: number }

type InjectedDependencies = {
  logger: Logger
}

export type AbundishFulfillmentOptions = {
  api_key?: string
  base_url?: string
  merchant_ref?: string
  /** Fall back to Google Distance Matrix tiers if Relay fails */
  fallback_to_distance_pricing?: boolean
}

const PRICING_CONFIG: DistancePricingConfig = {
  centralLocation: {
    address: "15 Wole Olateju Cres, Lekki Phase I, Street 106104, Lagos",
    lat: 6.446166224813956,
    lng: 3.4541383686722362,
  },
  pricingTiers: [
    {
      minDistance: 0,
      maxDistance: 6,
      pricePerKm: 0,
      basePrice: 1800,
      maxPrice: 1800,
      description: "Local delivery within immediate area",
    },
    {
      minDistance: 6.1,
      maxDistance: 8,
      pricePerKm: 0,
      basePrice: 2000,
      maxPrice: 2000,
      description: "Short distance delivery",
    },
    {
      minDistance: 8.1,
      maxDistance: 9,
      pricePerKm: 0,
      basePrice: 2200,
      maxPrice: 2200,
      description: "Medium distance delivery",
    },
    {
      minDistance: 9,
      maxDistance: 10,
      pricePerKm: 0,
      basePrice: 2400,
      maxPrice: 2400,
      description: "Long distance delivery",
    },
    {
      minDistance: 10.1,
      maxDistance: 13,
      pricePerKm: 0,
      basePrice: 2700,
      maxPrice: 2700,
      description: "Extended range delivery",
    },
    {
      minDistance: 13.1,
      maxDistance: 15,
      pricePerKm: 0,
      basePrice: 7000,
      maxPrice: 7000,
      description: "Long haul delivery",
    },
    {
      minDistance: 15.1,
      maxDistance: 40,
      pricePerKm: 0,
      basePrice: 10000,
      maxPrice: 10000,
      description: "Super Long haul delivery",
    },
  ],
  cacheDistanceResults: true,
  cacheExpiryHours: 24,
}

const QUOTE_CACHE_TTL_MS = 5 * 60 * 1000

class AbundishFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static identifier = "abundish-fulfillment"

  protected logger_: Logger
  protected options_: AbundishFulfillmentOptions
  private googleMapsClient: Client
  private config: DistancePricingConfig
  private cache: Map<string, CacheEntry>
  private quoteCache: Map<string, QuoteCacheEntry>
  private relay: RelayClient | null

  constructor(
    { logger }: InjectedDependencies,
    options: AbundishFulfillmentOptions = {}
  ) {
    super()
    this.logger_ = logger
    this.options_ = options
    this.googleMapsClient = new Client({})
    this.cache = new Map()
    this.quoteCache = new Map()
    this.config = PRICING_CONFIG

    const apiKey = options.api_key || process.env.CHOWDECK_RELAY_API_KEY
    const merchantRef =
      options.merchant_ref || process.env.CHOWDECK_MERCHANT_REF
    this.relay =
      apiKey && merchantRef
        ? new RelayClient({
            apiKey,
            merchantRef,
            baseUrl:
              options.base_url ||
              process.env.CHOWDECK_RELAY_BASE_URL ||
              undefined,
          })
        : null

    if (!this.relay) {
      this.logger_.warn(
        "[AbundishFulfillment] CHOWDECK_RELAY_API_KEY or CHOWDECK_MERCHANT_REF is not set — using distance-tier pricing fallback"
      )
    }
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return [{ id: "standard-delivery", name: "Standard Delivery" }]
  }

  async validateOption(data: Record<string, unknown>): Promise<boolean> {
    return data.id === "standard-delivery"
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      const quote = await this.getRelayQuote(context)
      if (quote) {
        return {
          ...data,
          provider: "chowdeck-relay",
          relay_fee_id: quote.id,
          relay_total_amount: quote.total_amount,
          relay_delivery_amount: quote.delivery_amount,
          relay_quoted_at: new Date().toISOString(),
        }
      }
    } catch (err: any) {
      this.logger_.warn(
        `[AbundishFulfillment] Could not attach Relay fee_id: ${err?.message || err}`
      )
    }

    return {
      ...data,
      provider: "distance-fallback",
    }
  }

  async canCalculate(data: CreateShippingOptionDTO): Promise<boolean> {
    return true
  }

  async calculatePrice(
    optionData: CalculateShippingOptionPriceDTO["optionData"],
    data: CalculateShippingOptionPriceDTO["data"],
    context: CalculateShippingOptionPriceDTO["context"]
  ): Promise<{
    calculated_amount: number
    is_calculated_price_tax_inclusive: boolean
  }> {
    const address = context?.shipping_address

    if (!address) {
      const fallback = this.config.pricingTiers[0]?.basePrice ?? 1800
      return {
        calculated_amount: fallback * 100,
        is_calculated_price_tax_inclusive: false,
      }
    }

    try {
      const quote = await this.getRelayQuote(context as Record<string, unknown>)
      if (quote) {
        // Relay amounts are already in the smallest currency unit (kobo).
        return {
          calculated_amount: quote.total_amount,
          is_calculated_price_tax_inclusive: false,
        }
      }
    } catch (err: any) {
      this.logger_.warn(
        `[AbundishFulfillment] Relay quote failed, falling back: ${err?.message || err}`
      )
    }

    if (this.options_.fallback_to_distance_pricing === false) {
      throw new Error("Unable to calculate delivery fee via Chowdeck Relay")
    }

    const fullAddress = this.formatAddress(
      address as unknown as Record<string, unknown>
    )
    const distanceKm = await this.getDistance(fullAddress)
    const priceNaira = this.priceFromDistance(distanceKm)

    return {
      calculated_amount: priceNaira * 100,
      is_calculated_price_tax_inclusive: false,
    }
  }

  async createFulfillment(
    data: Record<string, unknown>,
    items: any[],
    order: any,
    fulfillment: any
  ): Promise<CreateFulfillmentResult> {
    // Delivery booking via Relay create-delivery can be wired here later
    // using data.relay_fee_id (re-quote first — fee IDs expire).
    return {
      data: {
        ...(data || {}),
      },
      labels: [],
    }
  }

  async cancelFulfillment(data: Record<string, unknown>): Promise<void> {}

  async createReturnFulfillment(
    fulfillment: Record<string, unknown>
  ): Promise<CreateFulfillmentResult> {
    return { data: {}, labels: [] }
  }

  async getFulfillmentDocuments(data: Record<string, unknown>): Promise<never[]> {
    return []
  }
  async getReturnDocuments(data: Record<string, unknown>): Promise<never[]> {
    return []
  }
  async getShipmentDocuments(data: Record<string, unknown>): Promise<never[]> {
    return []
  }
  async retrieveDocuments(
    fulfillmentData: Record<string, unknown>,
    documentType: string
  ): Promise<void> {}

  // ─── Relay ────────────────────────────────────────────────────────────────

  private async getRelayQuote(
    context: Record<string, unknown>
  ): Promise<RelayFeeQuote | null> {
    if (!this.relay) {
      return null
    }

    const address = context?.shipping_address as
      | Record<string, unknown>
      | undefined
    if (!address) {
      return null
    }

    const destination = this.formatAddress(address)
    if (!destination) {
      return null
    }

    const estimatedOrderAmount = this.estimateOrderAmount(context)
    const cacheKey = `${destination.toLowerCase()}|${estimatedOrderAmount}`

    const cached = this.quoteCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < QUOTE_CACHE_TTL_MS) {
      return cached.quote
    }

    const quote = await this.relay.getDeliveryFee({
      source_address_string: this.config.centralLocation.address,
      destination_address_string: destination,
      estimated_order_amount: estimatedOrderAmount,
    })

    this.quoteCache.set(cacheKey, { quote, timestamp: Date.now() })
    this.logger_.info(
      `[AbundishFulfillment] Relay quote #${quote.id}: ₦${(
        quote.total_amount / 100
      ).toFixed(2)} → ${destination}`
    )

    return quote
  }

  private estimateOrderAmount(context: Record<string, unknown>): number {
    const items = (context?.items as any[]) || []
    if (!items.length) {
      return 0
    }

    // Medusa cart unit_price is in major currency units (e.g. 9000 = ₦9,000).
    // Relay expects the smallest unit (kobo).
    const totalKobo = items.reduce((sum, item) => {
      const unit = Number(item?.unit_price ?? 0) || 0
      const qty = Number(item?.quantity ?? 1) || 1
      return sum + Math.round(unit * qty * 100)
    }, 0)

    return Math.max(0, totalKobo)
  }

  private formatAddress(address: Record<string, unknown>): string {
    const parts: string[] = []
    if (address.address_1) parts.push(String(address.address_1))
    if (address.address_2) parts.push(String(address.address_2))
    if (address.city) parts.push(String(address.city))
    if (address.province) parts.push(String(address.province))
    if (address.postal_code) parts.push(String(address.postal_code))
    if (address.country_code) parts.push(String(address.country_code))
    return parts.join(", ")
  }

  // ─── Distance fallback ────────────────────────────────────────────────────

  private async getDistance(
    destinationAddress: string,
    retryCount = 0
  ): Promise<number> {
    const maxRetries = 3
    const cacheKey = destinationAddress.toLowerCase().trim()

    if (this.config.cacheDistanceResults && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!
      const expiryMs = this.config.cacheExpiryHours * 60 * 60 * 1000
      if (Date.now() - cached.timestamp < expiryMs) {
        return cached.distance
      }
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY is not set")

    const { lat, lng } = this.config.centralLocation
    const origin = `${lat},${lng}`

    try {
      const response = await this.googleMapsClient.distancematrix({
        params: {
          origins: [origin],
          destinations: [destinationAddress],
          key: apiKey,
          region: "ng",
        },
      })

      if (response.data.status !== "OK") {
        throw new Error(`Distance Matrix API error: ${response.data.status}`)
      }

      const element = response.data.rows[0]?.elements[0]
      if (!element || element.status !== "OK") {
        throw new Error(`Element error: ${element?.status ?? "no data"}`)
      }

      const distanceKm = element.distance.value / 1000

      if (this.config.cacheDistanceResults) {
        this.cache.set(cacheKey, {
          distance: distanceKm,
          timestamp: Date.now(),
        })
      }

      return distanceKm
    } catch (err: any) {
      if (retryCount < maxRetries) {
        const delay = 1000 * Math.pow(2, retryCount)
        await new Promise((r) => setTimeout(r, delay))
        return this.getDistance(destinationAddress, retryCount + 1)
      }
      throw err
    }
  }

  private priceFromDistance(distanceKm: number): number {
    const tiers = this.config.pricingTiers

    const tier =
      tiers.find((t) => {
        const inMin = distanceKm >= t.minDistance
        const inMax = t.maxDistance === null || distanceKm < t.maxDistance
        return inMin && inMax
      }) ?? tiers[tiers.length - 1]

    const base = tier.basePrice ?? 0
    const perKm = tier.pricePerKm ?? 0
    let price = base + distanceKm * perKm

    if (
      tier.maxPrice !== null &&
      tier.maxPrice !== undefined &&
      price > tier.maxPrice
    ) {
      price = tier.maxPrice
    }

    return Math.round(price)
  }
}

export default AbundishFulfillmentProviderService
