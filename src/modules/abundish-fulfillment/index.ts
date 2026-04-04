import { Module } from "@medusajs/framework/utils"
import AbundishFulfillmentProviderService from "./service"

export const ABUNDISH_FULFILLMENT_MODULE = "abundish-fulfillment"

export default Module(ABUNDISH_FULFILLMENT_MODULE, {
    service: AbundishFulfillmentProviderService,
})