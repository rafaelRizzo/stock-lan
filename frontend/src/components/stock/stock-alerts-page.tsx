import { useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  PackageSearch,
  TriangleAlert,
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
import { TableSkeletonRows } from "@/components/shared/table-skeleton"
import { useStockAlerts } from "@/hooks/stock/use-stock-batches"
import { DEFAULT_PAGE_SIZE } from "@/lib/constants"
import type { StockAlertBatch } from "@/services/stock.service"

const pageSize = DEFAULT_PAGE_SIZE

export function StockAlertsPage() {
  const [page, setPage] = useState(1)
  const alerts = useStockAlerts({ page, limit: pageSize })

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-7">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <PackageSearch className="size-4" /> Operação
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
          Alertas de estoque
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Lotes cujo saldo atingiu a quantidade mínima configurada.
        </p>
      </div>
      <section className="rounded-2xl border border-[#e5e9e4] bg-background dark:border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Produto</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Disponível</TableHead>
              <TableHead>Limite</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.isLoading ? (
              <TableSkeletonRows
                columns={[
                  { className: "py-3 pl-5", variant: "avatar", width: "w-40" },
                  { width: "w-24" },
                  { width: "w-16" },
                  { width: "w-16" },
                  { variant: "badge", width: "w-24" },
                ]}
              />
            ) : (
              alerts.data?.data.map((batch) => (
                <AlertRow batch={batch} key={batch.id} />
              ))
            )}
            {!alerts.isLoading && alerts.data?.data.length === 0 && (
              <TableRow>
                <TableCell
                  className="h-52 text-center text-muted-foreground"
                  colSpan={5}
                >
                  Nenhum alerta de estoque no momento.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Pagination data={alerts.data} page={page} setPage={setPage} />
      </section>
    </div>
  )
}

function AlertRow({ batch }: { batch: StockAlertBatch }) {
  const available = Number(batch.quantityLeft)
  const limit = Number(batch.quantityNotify)
  const depleted = available <= 0

  return (
    <TableRow>
      <TableCell className="py-3 pl-5">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <TriangleAlert className="size-4" />
          </span>
          <p className="font-medium">{batch.product.name}</p>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {batch.supplier?.name || "-"}
      </TableCell>
      <TableCell className="font-medium text-destructive">
        {formatQuantity(available)}
      </TableCell>
      <TableCell>{formatQuantity(limit)}</TableCell>
      <TableCell>
        <Badge
          className={
            depleted
              ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
          }
        >
          {depleted ? "Esgotado" : "Abaixo do limite"}
        </Badge>
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
      <span>{data?.total ?? 0} alertas</span>
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

const formatQuantity = (value: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(value)
