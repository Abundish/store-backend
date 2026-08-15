import { defineConfig } from '@medusajs/framework/utils'

const rbacEnabled = process.env.MEDUSA_FF_RBAC === "true"

module.exports = defineConfig({
  projectConfig: {
    databaseDriverOptions: {
      ssl: false,
      sslmode: "disable",
    },
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  featureFlags: {
    rbac: rbacEnabled,
  },
  modules: [
    {
      resolve: "./src/modules/newsletter",
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/paystack-payment",
            options: {
              secret_key: process.env.PAYSTACK_SECRET_KEY || "",
              debug: process.env.NODE_ENV !== "production",
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          {
            resolve: "@medusajs/fulfillment-manual",
            id: "manual",
          },
          {
            resolve: "./src/modules/abundish-fulfillment",
            id: "abundish-fulfillment",
            options: {
              api_key: process.env.CHOWDECK_RELAY_API_KEY || "",
              base_url: process.env.CHOWDECK_RELAY_BASE_URL || "",
              fallback_to_distance_pricing: true,
            },
          },
        ],
      },
    },
    ...(rbacEnabled
      ? [{ resolve: "@medusajs/medusa/rbac" as const }]
      : []),
  ],
  admin: {
    backendUrl: process.env.MEDUSA_BACKEND_URL,
    vite: (config) => {
      return {
        server: {
          host: "0.0.0.0",
          allowedHosts: [
            "localhost",
            ".localhost",
            "127.0.0.1",
            "api.abundish.info",
            "staging-api.abundish.info"
          ],
          hmr: {
            port: 5173,
            clientPort: 5173,
          },
        },
      }
    },
  },
})