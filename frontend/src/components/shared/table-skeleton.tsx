import { TableCell, TableRow } from "@/components/ui/table"

export type SkeletonColumn = {
  className?: string
  variant?: "avatar" | "text" | "badge" | "actions" | "icon" | "button"
  width?: string
  align?: "left" | "right"
}

export function TableSkeletonRows({
  rows = 4,
  columns,
}: {
  rows?: number
  columns: SkeletonColumn[]
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {columns.map((column, columnIndex) => (
            <TableCell className={column.className} key={columnIndex}>
              <SkeletonCell column={column} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

function SkeletonCell({ column }: { column: SkeletonColumn }) {
  const justify = column.align === "right" ? "justify-end" : "justify-start"
  if (column.variant === "avatar")
    return (
      <div className="flex items-center gap-3">
        <span className="size-8 shrink-0 animate-pulse rounded-lg bg-muted" />
        <div className="space-y-1.5">
          <span
            className={`block h-3.5 animate-pulse rounded bg-muted ${column.width ?? "w-32"}`}
          />
          <span className="block h-3 w-20 animate-pulse rounded bg-muted/70" />
        </div>
      </div>
    )
  if (column.variant === "badge")
    return (
      <div className={`flex ${justify}`}>
        <span
          className={`inline-block h-5 animate-pulse rounded-full bg-muted ${column.width ?? "w-16"}`}
        />
      </div>
    )
  if (column.variant === "actions")
    return (
      <div className="flex items-center gap-1">
        <span className="size-7 animate-pulse rounded-lg bg-muted" />
        <span className="size-7 animate-pulse rounded-lg bg-muted" />
      </div>
    )
  if (column.variant === "icon")
    return <span className="size-7 animate-pulse rounded-lg bg-muted" />
  if (column.variant === "button")
    return (
      <div className={`flex ${justify}`}>
        <span
          className={`inline-block h-8 animate-pulse rounded-xl bg-muted ${column.width ?? "w-24"}`}
        />
      </div>
    )
  return (
    <div className={`flex ${justify}`}>
      <span
        className={`block h-4 animate-pulse rounded bg-muted ${column.width ?? "w-16"}`}
      />
    </div>
  )
}
