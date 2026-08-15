import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

/**
 * One-time bootstrap: assign the Super Admin RBAC role to an admin user.
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com npx medusa exec ./src/scripts/bootstrap-rbac-super-admin.ts
 *
 * Or pass the user id directly:
 *   ADMIN_USER_ID=user_01... npx medusa exec ./src/scripts/bootstrap-rbac-super-admin.ts
 */
export default async function bootstrapRbacSuperAdmin({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  const adminEmail = process.env.ADMIN_EMAIL
  const adminUserId = process.env.ADMIN_USER_ID
  const superAdminRoleId = "role_super_admin"

  let userId = adminUserId

  if (!userId && adminEmail) {
    const { data: users } = await query.graph({
      entity: "user",
      fields: ["id", "email"],
      filters: { email: adminEmail },
    })

    userId = users?.[0]?.id
    if (!userId) {
      throw new Error(`No admin user found with email: ${adminEmail}`)
    }
  }

  if (!userId) {
    throw new Error(
      "Set ADMIN_EMAIL or ADMIN_USER_ID before running this script."
    )
  }

  const { data: roles } = await query.graph({
    entity: "rbac_role",
    fields: ["id", "name"],
    filters: { id: superAdminRoleId },
  })

  if (!roles?.length) {
    throw new Error(
      `Role "${superAdminRoleId}" not found. Run "npx medusa db:migrate" and restart the server first.`
    )
  }

  const { data: existingLinks } = await query.graph({
    entity: "user_rbac_role",
    fields: ["id"],
    filters: {
      user_id: userId,
      rbac_role_id: superAdminRoleId,
    },
  })

  if (existingLinks?.length) {
    console.log(`User ${userId} already has Super Admin role.`)
    return
  }

  await link.create([
    {
      [Modules.USER]: { user_id: userId },
      [Modules.RBAC]: { rbac_role_id: superAdminRoleId },
    },
  ])

  console.log(`Assigned Super Admin role to user ${userId}.`)
  console.log("Log out of the admin dashboard and log back in to refresh permissions.")
}
