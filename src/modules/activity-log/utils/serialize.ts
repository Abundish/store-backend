export function toJsonSafe(value: unknown): Record<string, unknown> | null {
  if (value == null) {
    return null
  }
  try {
    return JSON.parse(
      JSON.stringify(value, (_key, nested) => {
        if (typeof nested === "bigint") {
          return nested.toString()
        }
        if (nested instanceof Date) {
          return nested.toISOString()
        }
        return nested
      })
    )
  } catch {
    return { note: "unserializable_state" }
  }
}
