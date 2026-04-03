import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { IProductModuleService } from "@medusajs/framework/types"

export default async function syncAllProducts({ container }: ExecArgs) {
  const { Meilisearch } = await import("meilisearch")  // dynamic import fixes the ESM issue

  const client = new Meilisearch({
    host: process.env.MEILISEARCH_HOST!,
    apiKey: process.env.MEILISEARCH_MASTER_KEY!,
  })

  const index = client.index("products")
  const productService: IProductModuleService = container.resolve(Modules.PRODUCT)

  console.log("Fetching all products...")

  const products = await productService.listProducts(
    {},
    { relations: ["collection", "tags", "images"], take: 1000, skip: 0 }
  )

  console.log(`Found ${products.length} products. Syncing...`)

  const documents = products.map((product) => ({
    id: product.id,
    title: product.title,
    handle: product.handle,
    description: product.description ?? null,
    thumbnail: product.thumbnail ?? null,
    collection_title: (product as any).collection?.title ?? null,
    tags: (product as any).tags?.map((t: any) => t.value) ?? [],
  }))

  await index.updateSettings({
    searchableAttributes: ["title", "description", "handle", "collection_title", "tags"],
    displayedAttributes: ["id", "title", "handle", "description", "thumbnail", "collection_title", "tags"],
    filterableAttributes: ["collection_title", "tags"],
  })

  await index.addDocuments(documents)
  console.log(`✅ Synced ${documents.length} products.`)
}