import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { IProductModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { Meilisearch } from "meilisearch"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const productService: IProductModuleService = req.scope.resolve(Modules.PRODUCT)
  const client = new Meilisearch({
    host: process.env.MEILISEARCH_HOST!,
    apiKey: process.env.MEILISEARCH_MASTER_KEY!,
  })
  const index = client.index("products")

  let offset = 0
  const limit = 100
  let total = 0

  while (true) {
    const [products, count] = await productService.listAndCountProducts(
      {},
      { relations: ["collection", "tags"], skip: offset, take: limit }
    )

    if (!products.length) break
    total = count

    const docs = products.map((p: any) => ({
      id: p.id,
      title: p.title,
      handle: p.handle,
      description: p.description ?? null,
      thumbnail: p.thumbnail ?? null,
      collection_title: (p as any).collection?.title ?? null,
      tags: (p as any).tags?.map((t: any) => t.value) ?? [],
    }))

    await index.addDocuments(docs)
    offset += limit
    if (offset >= count) break
  }

  res.json({ synced: total })
}