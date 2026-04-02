import { defineConfig } from '@medusajs/framework/utils'

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
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          // other payment providers like stripe, paypal etc
          {
            resolve: "medusa-payment-paystack",
            options: {
              secret_key: process.env.PAYSTACK_SECRET_KEY || "",
            } satisfies import("medusa-payment-paystack").PluginOptions,
          },
        ],
      },
    },
    {
      resolve: "medusa-plugin-meilisearch",
      options: {
        config: {
          host: process.env.MEILISEARCH_HOST,        // http://meilisearch:7700
          apiKey: process.env.MEILISEARCH_MASTER_KEY,
        },
        settings: {
          products: {
            indexSettings: {
              searchableAttributes: [
                "title",
                "description",
                "handle",
                "collection_title",
                "tags",
              ],
              displayedAttributes: [
                "id",
                "title",
                "handle",
                "description",
                "thumbnail",
                "collection_title",
                "tags",
                "variants",
              ],
              filterableAttributes: ["collection_title", "tags"],
            },
            primaryKey: "id",
            // Transform the product before indexing
            transformer: (product: any) => ({
              id: product.id,
              title: product.title,
              handle: product.handle,
              description: product.description,
              thumbnail: product.thumbnail,
              collection_title: product.collection?.title ?? null,
              tags: product.tags?.map((t: any) => t.value) ?? [],
              variants: product.variants ?? [],
            }),
          },
        },
      },
    },
  ],
  admin: {
    backendUrl: process.env.MEDUSA_BACKEND_URL,
    vite: (config) => {
      return {
        server: {
          host: "0.0.0.0",
          // Allow all hosts when running in Docker (development mode)
          // In production, this should be more restrictive
          allowedHosts: [
            "localhost",
            ".localhost",
            "127.0.0.1",
            "api.abundish.info"
          ],
          hmr: {
            // HMR websocket port inside container
            port: 5173,
            // Port browser connects to (exposed in docker-compose.yml)
            clientPort: 5173,
          },
        },
      }
    },
  },
})
