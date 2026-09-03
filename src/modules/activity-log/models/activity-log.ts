import { model } from "@medusajs/framework/utils"

export const ActivityLog = model
  .define("activity_log", {
    id: model.id({ prefix: "actlog" }).primaryKey(),
    entity_type: model.text(),
    entity_id: model.text(),
    action: model.text(),
    actor_id: model.text().nullable(),
    actor_type: model.text().default("system"),
    before_state: model.json().nullable(),
    after_state: model.json().nullable(),
    metadata: model.json().nullable(),
    occurred_at: model.dateTime(),
  })
  .indexes([
    { on: ["entity_type", "entity_id"] },
    { on: ["actor_id"] },
    { on: ["occurred_at"] },
    { on: ["action"] },
  ])
