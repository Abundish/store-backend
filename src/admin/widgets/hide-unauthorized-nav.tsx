import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useEffect } from "react"
import { hideUnauthorizedNav } from "../lib/hide-unauthorized-nav"
import { sdk } from "../lib/sdk"

type MePermissionsResponse = {
  permissions?: string[]
}

const HideUnauthorizedNavWidget = () => {
  useEffect(() => {
    let cancelled = false
    let observer: MutationObserver | undefined

    const start = async () => {
      let permissions: string[]
      try {
        const response = await sdk.client.fetch<MePermissionsResponse>(
          "/admin/rbac/me/permissions"
        )
        permissions = response?.permissions ?? []
      } catch {
        return
      }

      if (cancelled) {
        return
      }

      const apply = () => {
        observer?.disconnect()
        hideUnauthorizedNav(permissions)
        observer?.observe(document.body, { childList: true, subtree: true })
      }

      observer = new MutationObserver(apply)
      apply()
    }

    void start()

    return () => {
      cancelled = true
      observer?.disconnect()
    }
  }, [])

  return <span aria-hidden className="hidden" />
}

export const config = defineWidgetConfig({
  zone: "topbar",
  id: "hide-unauthorized-nav",
})

export default HideUnauthorizedNavWidget
