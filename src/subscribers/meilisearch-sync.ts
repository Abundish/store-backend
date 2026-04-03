import { IProductModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

let _index: Awaited<ReturnType<typeof getMeilisearchIndex>> | null = null

async function getIndex() {
  if (!_index) _index = await getMeilisearchIndex()
  return _index
}

async function getMeilisearchIndex() {
  const { Meilisearch } = await import("meilisearch")

  const client = new Meilisearch({
    host: process.env.MEILISEARCH_HOST!,
    apiKey: process.env.MEILISEARCH_MASTER_KEY!,
  })

  const index = client.index("products")

  await index.updateSettings({
    searchableAttributes: ["title", "description", "handle", "collection_title", "tags"],
    displayedAttributes: ["id", "title", "handle", "description", "thumbnail", "collection_title", "tags"],
    filterableAttributes: ["collection_title", "tags"],
  }).catch(console.error)

  return index
}

async function upsertProduct(productService: IProductModuleService, productId: string) {
  const [product] = await productService.listProducts(
    { id: [productId] },
    { relations: ["collection", "tags", "images"] }
  )
  if (!product) return

  const index = await getIndex()

  await index.addDocuments([{
    id: product.id,
    title: product.title,
    handle: product.handle,
    description: product.description ?? null,
    thumbnail: product.thumbnail ?? null,
    collection_title: (product as any).collection?.title ?? null,
    tags: (product as any).tags?.map((t: any) => t.value) ?? [],
  }])
}

export default async function meilisearchSync({
  event,
  container,
}: {
  event: { name: string; data: { id: string } }
  container: any
}) {
  const productService: IProductModuleService = container.resolve(Modules.PRODUCT)
  const productId = event.data?.id
  if (!productId) return

  if (
    event.name === "product.created" ||
    event.name === "product.updated"
  ) {
    await upsertProduct(productService, productId)
  }

  if (event.name === "product.deleted") {
    const index = await getIndex()
    await index.deleteDocument(productId)
  }
}

export const config = {
  event: ["product.created", "product.updated", "product.deleted"],
}