import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260901140000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "activity_log" ("id" text not null, "entity_type" text not null, "entity_id" text not null, "action" text not null, "actor_id" text null, "actor_type" text not null default 'system', "before_state" jsonb null, "after_state" jsonb null, "metadata" jsonb null, "occurred_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "activity_log_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_activity_log_deleted_at" ON "activity_log" ("deleted_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_activity_log_entity_type_entity_id" ON "activity_log" ("entity_type", "entity_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_activity_log_actor_id" ON "activity_log" ("actor_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_activity_log_occurred_at" ON "activity_log" ("occurred_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_activity_log_action" ON "activity_log" ("action") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "activity_log" cascade;`)
  }
}
