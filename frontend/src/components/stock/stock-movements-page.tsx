import { useState } from "react"
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  SlidersHorizontal,
  Undo2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DateRangePicker } from "@/components/shared/date-range-picker"
import { TableSkeletonRows } from "@/components/shared/table-skeleton"
import { useStockMovements } from "@/hooks/stock/use-stock-batches"
import { DEFAULT_PAGE_SIZE } from "@/lib/constants"
import type { StockMovement, StockMovementType } from "@/services/stock.service"

const pageSize = DEFAULT_PAGE_SIZE
const labels: Record<StockMovementType, string> = {
  IN: "Entrada",
  OUT: "Saída",
  ADJUSTMENT: "Ajuste",
  REVERSAL: "Estorno",
}

export function StockMovementsPage() {
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const movements = useStockMovements({
    page,
    limit: pageSize,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  })
  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="size-4" /> Operação
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
          Movimentações
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Histórico de todas as entradas, saídas e ajustes de estoque.
        </p>
      </div>
      <section className="rounded-2xl border border-[#e5e9e4] bg-background dark:border-border">
        <div className="flex flex-col gap-3 border-b border-[#e5e9e4] p-4 sm:flex-row sm:items-center dark:border-border">
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(from, to) => {
              setDateFrom(from)
              setDateTo(to)
              setPage(1)
            }}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Movimentação</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead className="hidden md:table-cell">Referência</TableHead>
              <TableHead className="hidden md:table-cell">Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.isLoading ? (
              <TableSkeletonRows
                columns={[
                  { className: "py-3 pl-5", variant: "avatar", width: "w-24" },
                  { width: "w-32" },
                  { width: "w-16" },
                  { className: "hidden md:table-cell", width: "w-32" },
                  { className: "hidden md:table-cell", width: "w-28" },
                ]}
              />
            ) : (
              movements.data?.data.map((movement) => (
                <MovementRow key={movement.id} movement={movement} />
              ))
            )}
            {!movements.isLoading && movements.data?.data.length === 0 && (
              <TableRow>
                <TableCell
                  className="h-52 text-center text-muted-foreground"
                  colSpan={5}
                >
                  Nenhuma movimentação encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Pagination data={movements.data} page={page} setPage={setPage} />
      </section>
    </div>
  )
}

function MovementRow({ movement }: { movement: StockMovement }) {
  const config: Record<
    StockMovementType,
    { className: string; icon: typeof ArrowDownLeft }
  > = {
    IN: {
      className:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
      icon: ArrowDownLeft,
    },
    OUT: {
      className:
        "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
      icon: ArrowUpRight,
    },
    ADJUSTMENT: {
      className:
        "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
      icon: SlidersHorizontal,
    },
    REVERSAL: {
      className: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
      icon: Undo2,
    },
  }
  const item = config[movement.type]
  const Icon = item.icon
  const positive =
    movement.type === "IN" ||
    movement.type === "REVERSAL" ||
    (movement.type === "ADJUSTMENT" && Number(movement.quantity) > 0)
  return (
    <TableRow>
      <TableCell className="py-3 pl-5">
        <div className="flex items-center gap-3">
          <span
            className={`grid size-8 place-items-center rounded-lg ${item.className}`}
          >
            <Icon className="size-4" />
          </span>
          <Badge className={item.className}>{labels[movement.type]}</Badge>
        </div>
      </TableCell>
      <TableCell className="font-medium">{movement.product.name}</TableCell>
      <TableCell
        className={
          positive
            ? "font-medium text-emerald-600 dark:text-emerald-300"
            : "font-medium text-rose-600 dark:text-rose-300"
        }
      >
        {positive ? "+" : "-"}
        {number(movement.quantity)}
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        {movement.sale?.clientName || movement.obs || "Lote de estoque"}
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        {date(movement.createdAt)}
      </TableCell>
    </TableRow>
  )
}
function Pagination({
  data,
  page,
  setPage,
}: {
  data?: { total: number; totalPage: number }
  page: number
  setPage: (page: number) => void
}) {
  return (
    <div className="flex items-center justify-between border-t border-[#e5e9e4] px-4 py-3 text-sm text-muted-foreground dark:border-border">
      <span>{data?.total ?? 0} movimentações</span>
      <div className="flex items-center gap-2">
        <Button
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          size="icon-sm"
          variant="outline"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span>
          Página {page} de {data?.totalPage ?? 1}
        </span>
        <Button
          disabled={page >= (data?.totalPage ?? 1)}
          onClick={() => setPage(page + 1)}
          size="icon-sm"
          variant="outline"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
const number = (value: string | number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(
    Math.abs(Number(value))
  )
const date = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
