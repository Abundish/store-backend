import { AbstractFulfillmentProviderService } from "@medusajs/utils"
import { MedusaError } from "@medusajs/framework/utils"
import {
    CreateShippingOptionDTO,
    CartPropsForFulfillment,
    CalculatedShippingOptionPrice,
    FulfillmentItemDTO,
    FulfillmentOrderDTO,
    FulfillmentDTO,
} from "@medusajs/framework/types"
import { Client } from "@googlemaps/google-maps-services-js"
import * as fs from "fs"
import * as path from "path"

// ── Types ──────────────────────────────────────────────────────────────────

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

type CacheEntry = {
    distance: number
    timestamp: number
}

// ── Service ────────────────────────────────────────────────────────────────

class AbundishFulfillmentProviderService extends AbstractFulfillmentProviderService {
    static identifier = "abundish-fulfillment"

    private googleMapsClient: Client
    private config: DistancePricingConfig
    private distanceCache: Map<string, CacheEntry>

    constructor() {
        super()

        this.googleMapsClient = new Client({})
        this.distanceCache = new Map()

        const configPath = path.join(__dirname, "distance-pricing.json")
        this.config = JSON.parse(fs.readFileSync(configPath, "utf8"))
    }

    // ── Fulfillment options shown in admin ──────────────────────────────────

    async getFulfillmentOptions() {
        return [
            { id: "standard-delivery", name: "Standard Delivery" },
        ]
    }

    // ── Price calculation ───────────────────────────────────────────────────

    async canCalculate(data: CreateShippingOptionDTO): Promise<boolean> {
        return true
    }
    async calculatePrice(
        optionData: Record<string, unknown>,
        data: Record<string, unknown>,
        context: CartPropsForFulfillment & Record<string, unknown>
    ): Promise<CalculatedShippingOptionPrice> {
        const address = this.buildAddress(context)

        if (!address) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "No shipping address provided to calculate delivery price"
            )
        }

        const distanceKm = await this.getDistance(address)
        const priceNaira = this.getPriceFromDistance(distanceKm)

        return {
            calculated_amount: priceNaira * 100, // kobo
            is_calculated_price_tax_inclusive: false,
        }
    }


    // ── Distance resolution ─────────────────────────────────────────────────

    private buildAddress(context: Record<string, unknown>): string | null {
        // Medusa passes the cart's shipping address in context
        const addr = (context as any)?.shipping_address

        if (!addr) return null

        const parts: string[] = []
        if (addr.address_1) parts.push(addr.address_1)
        if (addr.address_2) parts.push(addr.address_2)
        if (addr.city) parts.push(addr.city)
        if (addr.province) parts.push(addr.province)
        if (addr.country_code) parts.push(addr.country_code)

        return parts.length > 0 ? parts.join(", ") : null
    }

    private async getDistance(destinationAddress: string): Promise<number> {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY
        if (!apiKey) {
            throw new MedusaError(
                MedusaError.Types.UNEXPECTED_STATE,
                "GOOGLE_MAPS_API_KEY is not set"
            )
        }

        // Check cache
        const cacheKey = destinationAddress.toLowerCase().trim()
        if (this.config.cacheDistanceResults && this.distanceCache.has(cacheKey)) {
            const cached = this.distanceCache.get(cacheKey)!
            const expiryMs = this.config.cacheExpiryHours * 60 * 60 * 1000
            if (Date.now() - cached.timestamp < expiryMs) {
                //console.log(`[AbundishFulfillment] Cache hit: ${distanceKm}km`)
                return cached.distance
            }
        }

        const { lat, lng } = this.config.centralLocation

        const response = await this.googleMapsClient.distancematrix({
            params: {
                origins: [`${lat},${lng}`],
                destinations: [destinationAddress],
                key: apiKey,
                region: "ng",
            },
        })

        if (response.data.status !== "OK") {
            throw new MedusaError(
                MedusaError.Types.UNEXPECTED_STATE,
                `Google Distance Matrix error: ${response.data.status}`
            )
        }

        const element = response.data.rows[0]?.elements[0]
        if (!element || element.status !== "OK") {
            throw new MedusaError(
                MedusaError.Types.UNEXPECTED_STATE,
                `Could not resolve distance for address: ${destinationAddress}`
            )
        }

        const distanceKm = element.distance.value / 1000
        console.log(`[AbundishFulfillment] ${distanceKm.toFixed(1)}km to "${destinationAddress}"`)

        // Store in cache
        if (this.config.cacheDistanceResults) {
            this.distanceCache.set(cacheKey, { distance: distanceKm, timestamp: Date.now() })
        }

        return distanceKm
    }

    // ── Tier pricing (straight from your original service) ──────────────────

    private getPriceFromDistance(distanceKm: number): number {
        const tier = this.config.pricingTiers.find(t => {
            if (t.maxDistance === null) return distanceKm >= t.minDistance
            return distanceKm >= t.minDistance && distanceKm < t.maxDistance
        }) ?? this.config.pricingTiers[this.config.pricingTiers.length - 1]

        const base = tier.basePrice ?? 0
        const perKm = tier.pricePerKm ?? 0
        let price = base + distanceKm * perKm

        if (tier.maxPrice !== null && tier.maxPrice !== undefined && price > tier.maxPrice) {
            price = tier.maxPrice
        }

        return Math.round(price)
    }

    // ── Required lifecycle stubs ─────────────────────────────────────────────

    async validateOption(data: Record<string, unknown>) {
        return true
    }

    async validateFulfillmentData(
        optionData: Record<string, unknown>,
        data: Record<string, unknown>,
        context: Record<string, unknown>
    ) {
        return data
    }

    async createFulfillment(
        data: Record<string, unknown>,
        items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
        order: Partial<FulfillmentOrderDTO> | undefined,
        fulfillment: Partial<FulfillmentDTO>
    ) {
        return {
            data: {},
            labels: [], // required by CreateFulfillmentResult
        }
    }

    async cancelFulfillment(fulfillment: Record<string, unknown>) {
        return {}
    }

    async createReturnFulfillment(fulfillment: Partial<FulfillmentDTO>) {
        return {
            data: {},
            labels: [],
        }
    }
}

export default AbundishFulfillmentProviderService