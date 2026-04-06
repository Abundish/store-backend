import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import {
    CalculateShippingOptionPriceDTO,
    FulfillmentOption,
    CreateFulfillmentResult,
    CreateShippingOptionDTO,
} from "@medusajs/framework/types"
import { Client } from "@googlemaps/google-maps-services-js"
import * as fs from "fs"
import * as path from "path"

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

class AbundishFulfillmentProviderService extends AbstractFulfillmentProviderService {
    static identifier = "abundish-fulfillment"

    private googleMapsClient: Client
    private config: DistancePricingConfig
    private cache: Map<string, CacheEntry>

    constructor() {
        super()

        this.googleMapsClient = new Client({})
        this.cache = new Map()

        const configPath = path.join(__dirname, "distance-pricing.json")
        const raw = fs.readFileSync(configPath, "utf8")
        this.config = JSON.parse(raw)
    }

    // ─── Required by AbstractFulfillmentProviderService ───────────────────────

    async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
        return [
            {
                id: "standard-delivery",
                name: "Standard Delivery",
            },
        ]
    }

    async validateOption(data: Record<string, unknown>): Promise<boolean> {
        return true
    }

    async validateFulfillmentData(
        optionData: Record<string, unknown>,
        data: Record<string, unknown>,
        context: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        return data
    }
    async canCalculate(data: CreateShippingOptionDTO): Promise<boolean> {
        return true
    }

    /**
     * Called during checkout to calculate the shipping price.
     * context.shipping_address contains the customer's address.
     */
    async calculatePrice(
        optionData: CalculateShippingOptionPriceDTO["optionData"],
        data: CalculateShippingOptionPriceDTO["data"],
        context: CalculateShippingOptionPriceDTO["context"]
    ): Promise<{ calculated_amount: number; is_calculated_price_tax_inclusive: boolean }> {
        const address = context?.shipping_address

        if (!address) {
            // fallback to minimum tier base price if no address yet
            const fallback = this.config.pricingTiers[0]?.basePrice ?? 1800
            return {
                calculated_amount: fallback * 100, // kobo
                is_calculated_price_tax_inclusive: false,
            }
        }

        const parts: string[] = []
        if (address.address_1) parts.push(address.address_1 as string)
        if (address.city) parts.push(address.city as string)
        if (address.province) parts.push(address.province as string)
        if (address.country_code) parts.push(address.country_code as string)

        const fullAddress = parts.join(", ")

        const distanceKm = await this.getDistance(fullAddress)
        const priceNaira = this.priceFromDistance(distanceKm)

        return {
            calculated_amount: priceNaira * 100, // convert to kobo
            is_calculated_price_tax_inclusive: false,
        }
    }

    async createFulfillment(
        data: Record<string, unknown>,
        items: any[],
        order: any,
        fulfillment: any
    ): Promise<CreateFulfillmentResult> {
        return { data: {}, labels: [] }
    }

    async cancelFulfillment(data: Record<string, unknown>): Promise<void> { }

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
    ): Promise<void> { }

    // ─── Distance + Pricing Helpers ───────────────────────────────────────────

    private async getDistance(destinationAddress: string, retryCount = 0): Promise<number> {
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
                this.cache.set(cacheKey, { distance: distanceKm, timestamp: Date.now() })
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

        if (tier.maxPrice !== null && tier.maxPrice !== undefined && price > tier.maxPrice) {
            price = tier.maxPrice
        }

        return Math.round(price)
    }
}

export default AbundishFulfillmentProviderService