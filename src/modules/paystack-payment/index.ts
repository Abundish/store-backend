import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import PaystackPaymentProcessor from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [PaystackPaymentProcessor],
})

export { PaystackPaymentProcessor }
export type { PluginOptions } from "./service"
