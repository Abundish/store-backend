import type { MedusaContainer } from "@medusajs/framework/types"

export async function attachActorEmails<
  T extends { actor_id?: string | null },
>(container: MedusaContainer, rows: T[]): Promise<(T & { actor_email: string | null })[]> {
  const ids = [
    ...new Set(
      rows
        .map((row) => row.actor_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    ),
  ]

  if (!ids.length) {
    return rows.map((row) => ({ ...row, actor_email: null }))
  }

  try {
    const userService = container.resolve("user") as {
      listUsers: (selector: { id: string[] }, config?: { select?: string[] }) => Promise<{ id: string; email?: string }[]>
    }
    const users = await userService.listUsers({ id: ids }, { select: ["id", "email"] })
    const emails = new Map(users.map((user) => [user.id, user.email ?? null]))
    return rows.map((row) => ({
      ...row,
      actor_email: row.actor_id ? emails.get(row.actor_id) ?? null : null,
    }))
  } catch {
    return rows.map((row) => ({ ...row, actor_email: null }))
  }
}
