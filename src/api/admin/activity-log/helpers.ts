import type { MedusaContainer } from "@medusajs/framework/types"

type UserRow = {
  id: string
  email?: string | null
  first_name?: string | null
  last_name?: string | null
}

export type ActorDisplay = {
  actor_email: string | null
  actor_name: string | null
}

function displayName(user?: UserRow): string | null {
  if (!user) {
    return null
  }
  const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim()
  return name || user.email || null
}

export async function attachActorEmails<
  T extends { actor_id?: string | null },
>(
  container: MedusaContainer,
  rows: T[]
): Promise<(T & ActorDisplay)[]> {
  const ids = [
    ...new Set(
      rows
        .map((row) => row.actor_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    ),
  ]

  if (!ids.length) {
    return rows.map((row) => ({ ...row, actor_email: null, actor_name: null }))
  }

  try {
    const userService = container.resolve("user") as {
      listUsers: (
        selector: { id: string[] },
        config?: { select?: string[] }
      ) => Promise<UserRow[]>
    }
    const users = await userService.listUsers(
      { id: ids },
      { select: ["id", "email", "first_name", "last_name"] }
    )
    const byId = new Map(users.map((user) => [user.id, user]))
    return rows.map((row) => {
      const user = row.actor_id ? byId.get(row.actor_id) : undefined
      return {
        ...row,
        actor_email: user?.email ?? null,
        actor_name: displayName(user),
      }
    })
  } catch {
    return rows.map((row) => ({ ...row, actor_email: null, actor_name: null }))
  }
}
