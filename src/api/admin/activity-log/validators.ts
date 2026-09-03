import { z } from "@medusajs/framework/zod"

export const GetActivityLogQuerySchema = z.object({
  entity_type: z.string().optional(),
  action: z.string().optional(),
  actor_id: z.string().optional(),
  entity_id: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

export const GetActivityLogExportQuerySchema = GetActivityLogQuerySchema.omit({
  limit: true,
  offset: true,
})

export type GetActivityLogQuery = z.infer<typeof GetActivityLogQuerySchema>
