import https from "https"

export interface PaystackResponse<T = Record<string, unknown>> {
  status: boolean
  message: string
  data: T
}

export interface PaystackTransactionInitData {
  authorization_url: string
  access_code: string
  reference: string
}

export interface PaystackTransactionVerifyData {
  id: number
  domain: string
  status: string
  reference: string
  receipt_number: string | null
  amount: number
  message: string | null
  gateway_response: string
  paid_at: string
  created_at: string
  channel: string
  currency: string
  ip_address: string
  metadata: Record<string, unknown>
  customer: {
    id: number
    first_name: string | null
    last_name: string | null
    email: string
    customer_code: string
    phone: string | null
    metadata: Record<string, unknown> | null
    risk_action: string
  }
  authorization: {
    authorization_code: string
    bin: string
    last4: string
    exp_month: string
    exp_year: string
    channel: string
    card_type: string
    bank: string
    country_code: string
    brand: string
    reusable: boolean
    signature: string
    account_name: string | null
  }
}

export interface PaystackRefundData {
  id: number
  integration: number
  deducted_amount: number
  channel: string
  merchant_note: string
  customer_note: string
  status: string
  refunded_by: string
  expected_at: string
  currency: string
  domain: string
  amount: number
  fully_deducted: boolean
  refunded_at: string | null
  created_at: string
  updated_at: string
  transaction: {
    id: number
    domain: string
    reference: string
    amount: number
    paid_at: string
    currency: string
  }
}

export class PaystackAPI {
  private secretKey: string
  private baseHost = "api.paystack.co"

  constructor(secretKey: string) {
    this.secretKey = secretKey
  }

  private request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<PaystackResponse<T>> {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : undefined

      const options: https.RequestOptions = {
        hostname: this.baseHost,
        port: 443,
        path,
        method,
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      }

      const req = https.request(options, (res) => {
        let data = ""
        res.on("data", (chunk) => (data += chunk))
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data) as PaystackResponse<T>
            resolve(parsed)
          } catch {
            reject(new Error(`Failed to parse Paystack response: ${data}`))
          }
        })
      })

      req.on("error", reject)

      if (payload) {
        req.write(payload)
      }

      req.end()
    })
  }

  transaction = {
    initialize: (params: {
      email: string
      amount: number
      currency?: string
      reference?: string
      metadata?: Record<string, unknown>
      callback_url?: string
    }) =>
      this.request<PaystackTransactionInitData>(
        "POST",
        "/transaction/initialize",
        params as unknown as Record<string, unknown>
      ),

    verify: (reference: string) =>
      this.request<PaystackTransactionVerifyData>(
        "GET",
        `/transaction/verify/${encodeURIComponent(reference)}`
      ),

    get: (id: number | string) =>
      this.request<PaystackTransactionVerifyData>(
        "GET",
        `/transaction/${id}`
      ),
  }

  refund = {
    create: (params: {
      transaction: number | string
      amount?: number
      currency?: string
      customer_note?: string
      merchant_note?: string
    }) =>
      this.request<PaystackRefundData>(
        "POST",
        "/refund",
        params as unknown as Record<string, unknown>
      ),
  }
}
