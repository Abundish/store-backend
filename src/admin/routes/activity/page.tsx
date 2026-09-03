import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  Select,
  Table,
  Text,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { sdk } from "../../lib/sdk"

type ActivityLog = {
  id: string
  entity_type: string
  entity_id: string
  action: string
  actor_id: string | null
  actor_type: string
  actor_email?: string | null
  actor_name?: string | null
  before_state: Record<string, unknown> | null
  after_state: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  occurred_at: string
}

type ActivityLogListResponse = {
  activity_logs: ActivityLog[]
  count: number
  limit: number
  offset: number
}

const ENTITY_TYPES = [
  { value: "", label: "All entities" },
  { value: "order", label: "Order" },
  { value: "product_variant", label: "Pricing / variant" },
  { value: "inventory", label: "Inventory" },
  { value: "promotion", label: "Promotion" },
  { value: "customer", label: "Customer" },
  { value: "user", label: "Admin user" },
]

const PAGE_SIZE = 20

function actorLabel(row: ActivityLog): string {
  if (row.actor_name && row.actor_email && row.actor_name !== row.actor_email) {
    return `${row.actor_name} (${row.actor_email})`
  }
  if (row.actor_name) {
    return row.actor_name
  }
  if (row.actor_email) {
    return row.actor_email
  }
  if (row.actor_id) {
    return row.actor_id
  }
  return row.actor_type || "system"
}

function flatten(value: unknown, prefix = ""): Record<string, string> {
  if (value == null) {
    return prefix ? { [prefix]: "—" } : {}
  }
  if (typeof value !== "object") {
    return { [prefix || "value"]: String(value) }
  }
  if (Array.isArray(value)) {
    return { [prefix || "value"]: JSON.stringify(value) }
  }
  return Object.entries(value as Record<string, unknown>).reduce(
    (acc, [key, nested]) => {
      const next = prefix ? `${prefix}.${key}` : key
      return { ...acc, ...flatten(nested, next) }
    },
    {} as Record<string, string>
  )
}

function DiffTable({
  before,
  after,
}: {
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}) {
  const rows = useMemo(() => {
    const left = flatten(before)
    const right = flatten(after)
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()
    return keys.map((key) => ({
      key,
      before: left[key] ?? "—",
      after: right[key] ?? "—",
      changed: (left[key] ?? "—") !== (right[key] ?? "—"),
    }))
  }, [before, after])

  if (!rows.length) {
    return <Text size="small">No before/after snapshot was captured for this event.</Text>
  }

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Field</Table.HeaderCell>
          <Table.HeaderCell>Before</Table.HeaderCell>
          <Table.HeaderCell>After</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rows.map((row) => (
          <Table.Row key={row.key} className={row.changed ? "bg-ui-bg-subtle" : undefined}>
            <Table.Cell>
              <Text size="small" leading="compact" weight="plus">
                {row.key}
              </Text>
            </Table.Cell>
            <Table.Cell>
              <Text size="small">{row.before}</Text>
            </Table.Cell>
            <Table.Cell>
              <Text size="small">{row.after}</Text>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  )
}

const ActivityPage = () => {
  const [q, setQ] = useState("")
  const [entityType, setEntityType] = useState("")
  const [action, setAction] = useState("")
  const [actorId, setActorId] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<ActivityLog | null>(null)

  const offset = page * PAGE_SIZE

  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      limit: PAGE_SIZE,
      offset,
    }
    if (q.trim()) params.q = q.trim()
    if (entityType) params.entity_type = entityType
    if (action.trim()) params.action = action.trim()
    if (actorId.trim()) params.actor_id = actorId.trim()
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    return params
  }, [q, entityType, action, actorId, dateFrom, dateTo, offset])

  const { data, isLoading } = useQuery<ActivityLogListResponse>({
    queryFn: () =>
      sdk.client.fetch("/admin/activity-log", {
        query: queryParams,
      }),
    queryKey: ["activity-log", queryParams],
  })

  const count = data?.count ?? 0
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE))

  const exportCsv = async () => {
    const search = new URLSearchParams()
    Object.entries(queryParams).forEach(([key, value]) => {
      if (key === "limit" || key === "offset") {
        return
      }
      search.set(key, String(value))
    })
    const response = await fetch(`/admin/activity-log/export?${search.toString()}`, {
      credentials: "include",
    })
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>Activity</Heading>
        <Button variant="secondary" size="small" onClick={exportCsv}>
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 px-6 py-4 md:grid-cols-3 lg:grid-cols-6">
        <div>
          <Label>Search entity ID</Label>
          <Input
            placeholder="ord_..."
            value={q}
            onChange={(event) => {
              setPage(0)
              setQ(event.target.value)
            }}
          />
        </div>
        <div>
          <Label>Entity type</Label>
          <Select
            value={entityType || "all"}
            onValueChange={(value) => {
              setPage(0)
              setEntityType(value === "all" ? "" : value)
            }}
          >
            <Select.Trigger>
              <Select.Value placeholder="All entities" />
            </Select.Trigger>
            <Select.Content>
              {ENTITY_TYPES.map((option) => (
                <Select.Item key={option.label} value={option.value || "all"}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div>
          <Label>Action</Label>
          <Input
            placeholder="refund_created"
            value={action}
            onChange={(event) => {
              setPage(0)
              setAction(event.target.value)
            }}
          />
        </div>
        <div>
          <Label>Actor ID</Label>
          <Input
            placeholder="user_..."
            value={actorId}
            onChange={(event) => {
              setPage(0)
              setActorId(event.target.value)
            }}
          />
        </div>
        <div>
          <Label>From</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setPage(0)
              setDateFrom(event.target.value)
            }}
          />
        </div>
        <div>
          <Label>To</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setPage(0)
              setDateTo(event.target.value)
            }}
          />
        </div>
      </div>

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>When</Table.HeaderCell>
            <Table.HeaderCell>Actor</Table.HeaderCell>
            <Table.HeaderCell>Action</Table.HeaderCell>
            <Table.HeaderCell>Entity</Table.HeaderCell>
            <Table.HeaderCell>Summary</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {(data?.activity_logs ?? []).map((row) => (
            <Table.Row
              key={row.id}
              className="cursor-pointer"
              onClick={() => setSelected(row)}
            >
              <Table.Cell>
                <Text size="small">
                  {new Date(row.occurred_at).toLocaleString()}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="small">{actorLabel(row)}</Text>
              </Table.Cell>
              <Table.Cell>
                <Badge size="2xsmall">{row.action}</Badge>
              </Table.Cell>
              <Table.Cell>
                <Text size="small">
                  {row.entity_type} · {row.entity_id}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Text size="small" className="text-ui-fg-subtle">
                  {row.actor_type} {row.action.replace(/_/g, " ")}
                </Text>
              </Table.Cell>
            </Table.Row>
          ))}
          {!isLoading && !data?.activity_logs?.length && (
            <Table.Row>
              <Table.Cell>
                <Text size="small">No activity recorded yet.</Text>
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table>

      <div className="flex items-center justify-between px-6 py-3">
        <Text size="small">
          {count} records · page {page + 1} of {pageCount}
        </Text>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="small"
            disabled={page === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="small"
            disabled={page + 1 >= pageCount}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <Drawer open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>{selected?.action ?? "Activity"}</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="space-y-4 p-4">
            {selected && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Text size="small">When: {new Date(selected.occurred_at).toLocaleString()}</Text>
                  <Text size="small">Actor: {actorLabel(selected)}</Text>
                  <Text size="small">Entity: {selected.entity_type}</Text>
                  <Text size="small">ID: {selected.entity_id}</Text>
                </div>
                <Heading level="h3">Changes</Heading>
                <DiffTable before={selected.before_state} after={selected.after_state} />
              </>
            )}
          </Drawer.Body>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Activity",
  icon: DocumentText,
})

export default ActivityPage
