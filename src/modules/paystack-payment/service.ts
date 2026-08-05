import crypto from "crypto"
import {
  AbstractPaymentProvider,
  MedusaError,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
  BigNumberInput,
  ProviderWebhookPayload,
} from "@medusajs/framework/types"
import { PaystackAPI } from "./lib/paystack"

export interface PluginOptions {
  secret_key: string
  debug?: boolean
}

/**
 * Converts a Medusa amount (in smallest currency unit, e.g. kobo for NGN)
 * to the unit Paystack expects.
 *
 * Paystack expects amounts in kobo (NGN subunit) — e.g. 500000 for ₦5,000.
 * Medusa stores amounts as integers in the smallest currency unit, so no
 * conversion is needed. We keep this helper for clarity and future-proofing.
 */
function toPaystackAmount(amount: BigNumberInput): number {
  return Math.round(Number(amount))
}

class PaystackPaymentProcessor extends AbstractPaymentProvider<PluginOptions> {
  static identifier = "paystack"

  private paystack: PaystackAPI
  private debug: boolean

  constructor(
    cradle: Record<string, unknown>,
    options: PluginOptions
  ) {
    super(cradle, options)

    if (!options.secret_key) {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT,
        "Paystack payment provider requires the `secret_key` option"
      )
    }

    this.paystack = new PaystackAPI(options.secret_key)
    this.debug = Boolean(options.debug)
  }

  private log(label: string, data?: unknown) {
    if (this.debug) {
      console.info(`[Paystack] ${label}`, data ? JSON.stringify(data, null, 2) : "")
    }
  }

  // ---------------------------------------------------------------------------
  // Initiate
  // ---------------------------------------------------------------------------

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    this.log("initiatePayment", input)

    const { amount, currency_code, context } = input
    const email = context?.customer?.email ?? "customer@abundish.com"

    try {
      const { data, status, message } =
        await this.paystack.transaction.initialize({
          email,
          // Paystack expects kobo (NGN subunit). Medusa amounts are already
          // in the smallest currency unit (kobo for NGN).
          amount: toPaystackAmount(amount),
          currency: currency_code?.toUpperCase(),
          metadata: {
            medusa_session_id: (context as Record<string, unknown>)?.session_id,
          },
        })

      if (!status) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `Paystack initiate failed: ${message}`
        )
      }

      return {
        id: data.reference,
        data: {
          paystackReference: data.reference,
          paystackAuthorizationUrl: data.authorization_url,
          paystackAccessCode: data.access_code,
        },
      }
    } catch (error) {
      this.log("initiatePayment error", error)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to initiate Paystack payment: ${(error as Error)?.message ?? error}`
      )
    }
  }

  // ---------------------------------------------------------------------------
  // Authorize (called after customer completes payment on Paystack)
  // ---------------------------------------------------------------------------

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    this.log("authorizePayment", input)

    const { paystackReference } = input.data as {
      paystackReference?: string
    }

    if (!paystackReference) {
      return {
        status: PaymentSessionStatus.PENDING,
        data: input.data,
      }
    }

    try {
      const { data, status, message } =
        await this.paystack.transaction.verify(paystackReference)

      if (!status) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `Paystack verification failed: ${message}`
        )
      }

      if (data.status === "success") {
        return {
          status: PaymentSessionStatus.AUTHORIZED,
          data: {
            ...input.data,
            paystackTxId: data.id,
            paystackTxData: data,
          },
        }
      }

      if (
        data.status === "abandoned" ||
        data.status === "failed"
      ) {
        return {
          status: PaymentSessionStatus.ERROR,
          data: {
            ...input.data,
            paystackTxData: data,
          },
        }
      }

      return {
        status: PaymentSessionStatus.PENDING,
        data: {
          ...input.data,
          paystackTxData: data,
        },
      }
    } catch (error) {
      this.log("authorizePayment error", error)
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to authorize Paystack payment: ${(error as Error)?.message ?? error}`
      )
    }
  }

  // ---------------------------------------------------------------------------
  // Capture (Paystack is auto-capture — nothing to do)
  // ---------------------------------------------------------------------------

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    this.log("capturePayment", input)
    return { data: input.data }
  }

  // ---------------------------------------------------------------------------
  // Refund — the key fix: amount must be in kobo (smallest unit), consistent
  // with how initiatePayment sends the charge to Paystack.
  // ---------------------------------------------------------------------------

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    this.log("refundPayment", input)

    const { paystackTxId } = input.data as { paystackTxId?: number }

    if (!paystackTxId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cannot refund: paystackTxId is missing from payment data. " +
          "The transaction may not have been authorized via Paystack."
      )
    }

    try {
      const refundAmount = toPaystackAmount(input.amount)

      this.log("refundPayment: calling Paystack /refund", {
        transaction: paystackTxId,
        amount: refundAmount,
      })

      const { data, status, message } = await this.paystack.refund.create({
        transaction: paystackTxId,
        amount: refundAmount,
        merchant_note: "Refund issued via Abundish admin",
      })

      if (!status) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `Paystack refund rejected: ${message}`
        )
      }

      return {
        data: {
          ...input.data,
          paystackRefundData: data,
        },
      }
    } catch (error) {
      this.log("refundPayment error", error)

      if (error instanceof MedusaError) throw error

      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to refund via Paystack: ${(error as Error)?.message ?? error}`
      )
    }
  }

  // ---------------------------------------------------------------------------
  // Cancel
  // ---------------------------------------------------------------------------

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    this.log("cancelPayment", input)
    // Paystack does not have a cancel API for completed charges.
    // If payment was never completed, just return the existing data.
    return { data: input.data }
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    this.log("deletePayment", input)
    return { data: input.data }
  }

  // ---------------------------------------------------------------------------
  // Get payment status
  // ---------------------------------------------------------------------------

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    this.log("getPaymentStatus", input)

    const { paystackTxId, paystackReference } = input.data as {
      paystackTxId?: number
      paystackReference?: string
    }

    if (!paystackTxId && !paystackReference) {
      return { status: PaymentSessionStatus.PENDING }
    }

    try {
      let txStatus: string

      if (paystackTxId) {
        const { data } = await this.paystack.transaction.get(paystackTxId)
        txStatus = data.status
      } else {
        const { data } = await this.paystack.transaction.verify(
          paystackReference!
        )
        txStatus = data.status
      }

      switch (txStatus) {
        case "success":
          return { status: PaymentSessionStatus.AUTHORIZED }
        case "abandoned":
        case "failed":
          return { status: PaymentSessionStatus.ERROR }
        default:
          return { status: PaymentSessionStatus.PENDING }
      }
    } catch (error) {
      this.log("getPaymentStatus error", error)
      return { status: PaymentSessionStatus.ERROR }
    }
  }

  // ---------------------------------------------------------------------------
  // Retrieve
  // ---------------------------------------------------------------------------

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    this.log("retrievePayment", input)

    const { paystackTxId } = input.data as { paystackTxId?: number }

    if (!paystackTxId) {
      return { data: input.data }
    }

    try {
      const { data } = await this.paystack.transaction.get(paystackTxId)
      return {
        data: {
          ...input.data,
          paystackTxData: data,
        },
      }
    } catch (error) {
      this.log("retrievePayment error", error)
      return { data: input.data }
    }
  }

  // ---------------------------------------------------------------------------
  // Update (re-initiate with new amount / context)
  // ---------------------------------------------------------------------------

  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    this.log("updatePayment", input)
    return await this.initiatePayment(input)
  }

  // ---------------------------------------------------------------------------
  // Webhook
  // ---------------------------------------------------------------------------

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    this.log("getWebhookActionAndData event", payload.data.event)

    const secretKey = this.config.secret_key
    const hash = crypto
      .createHmac("sha512", secretKey)
      .update(
        typeof payload.rawData === "string"
          ? payload.rawData
          : payload.rawData.toString("utf8")
      )
      .digest("hex")

    const signature =
      payload.headers["x-paystack-signature"] ??
      payload.headers["X-Paystack-Signature"]

    if (hash !== signature) {
      return { action: "not_supported" }
    }

    const { event, data } = payload.data

    if (event === "charge.success") {
      const txData = data as {
        id: number
        reference: string
        amount: number
        status: string
      }

      return {
        action: "authorized",
        data: {
          session_id: (txData as unknown as Record<string, unknown>)
            ?.metadata?.["medusa_session_id"] as string,
          amount: txData.amount,
        },
      }
    }

    return { action: "not_supported" }
  }
}

export default PaystackPaymentProcessor
