import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { DateRangePicker } from "@/components/shared/date-range-picker"
import { TableSkeletonRows } from "@/components/shared/table-skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  useCashBalance,
  useCashMovements,
  useCreateCashMovement,
  useDeleteCashMovement,
} from "@/hooks/cash-movements/use-cash-movements"
import { DEFAULT_PAGE_SIZE } from "@/lib/constants"
import { getApiErrorMessage } from "@/lib/http"
import type {
  CashMovement,
  CashMovementType,
} from "@/services/cash-movements.service"

const pageSize = DEFAULT_PAGE_SIZE
const types: Record<CashMovementType, string> = {
  DEPOSIT: "Aporte",
  WITHDRAWAL: "Sangria",
}
const selectClass =
  "h-10! w-full rounded-xl! border-[#dce3de]! bg-input/50! px-2.5! py-1! text-sm shadow-none data-[size=default]:h-10! dark:border-border!"

export function CashMovementsPage() {
  const [page, setPage] = useState(1)
  const [type, setType] = useState<CashMovementType | "">("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [open, setOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CashMovement | null>(null)
  const movements = useCashMovements({
    page,
    limit: pageSize,
    type: type || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  })
  const balance = useCashBalance()

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="size-4" /> Financeiro
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
            Caixa
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Registre aportes e sangrias manuais. Saídas de estoque geram
            sangria automática aqui.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-[#eaf4ec] px-4 py-3 dark:bg-emerald-950">
            <p className="text-xs font-medium text-[#2e7152] dark:text-emerald-300">
              Saldo em caixa
            </p>
            <p className="mt-1 text-lg font-semibold text-[#2e7152] dark:text-emerald-300">
              {formatCurrency(balance.data?.balance ?? 0)}
            </p>
          </div>
          <Button
            className="h-10 rounded-xl bg-[#173f31] text-white hover:bg-[#245742]"
            onClick={() => setOpen(true)}
          >
            <Plus className="size-4" /> Nova movimentação
          </Button>
        </div>
      </div>
      <section className="rounded-2xl border border-[#e5e9e4] bg-background dark:border-border">
        <div className="flex flex-col gap-3 border-b border-[#e5e9e4] p-4 sm:flex-row sm:items-center dark:border-border">
          <Select
            value={type || "ALL"}
            onValueChange={(value) => {
              setType(value === "ALL" ? "" : (value as CashMovementType))
              setPage(1)
            }}
          >
            <SelectTrigger className={`${selectClass} sm:w-52`}>
              <span>{type ? types[type] : "Todos os tipos"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os tipos</SelectItem>
              {Object.entries(types).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <TableHead className="pl-5">Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.isLoading ? (
              <TableSkeletonRows
                columns={[
                  { className: "py-3 pl-5", variant: "avatar", width: "w-32" },
                  { width: "w-20" },
                  { width: "w-24" },
                  { variant: "actions" },
                ]}
              />
            ) : (
              movements.data?.data.map((movement) => (
                <CashMovementRow
                  key={movement.id}
                  movement={movement}
                  onDelete={setDeleteTarget}
                />
              ))
            )}
            {!movements.isLoading && movements.data?.data.length === 0 && (
              <TableRow>
                <TableCell
                  className="h-52 text-center text-muted-foreground"
                  colSpan={4}
                >
                  Nenhuma movimentação encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Pagination data={movements.data} page={page} setPage={setPage} />
      </section>
      <CashMovementDialog onClose={() => setOpen(false)} open={open} />
      <DeleteCashMovementDialog
        movement={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function CashMovementRow({
  movement,
  onDelete,
}: {
  movement: CashMovement
  onDelete: (movement: CashMovement) => void
}) {
  const isDeposit = movement.type === "DEPOSIT"
  return (
    <TableRow>
      <TableCell className="py-3 pl-5">
        <div className="flex items-center gap-3">
          <span
            className={`grid size-8 place-items-center rounded-lg ${
              isDeposit
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
            }`}
          >
            {isDeposit ? (
              <ArrowUpCircle className="size-4" />
            ) : (
              <ArrowDownCircle className="size-4" />
            )}
          </span>
          <div>
            <p className="font-medium">{types[movement.type]}</p>
            {movement.obs && (
              <p className="max-w-64 truncate text-xs text-muted-foreground">
                {movement.obs}
              </p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell
        className={`font-medium ${
          isDeposit
            ? "text-[#2e7152] dark:text-emerald-300"
            : "text-[#b84c5d] dark:text-rose-300"
        }`}
      >
        {isDeposit ? "+" : "-"} {formatCurrency(movement.value)}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDate(movement.createdAt)}
      </TableCell>
      <TableCell>
        {!movement.stockBatchId && (
          <Button
            aria-label="Excluir movimentação"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(movement)}
            size="icon-sm"
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

function CashMovementDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [type, setType] = useState<CashMovementType>("DEPOSIT")
  const [value, setValue] = useState("")
  const [obs, setObs] = useState("")
  const [error, setError] = useState<string | null>(null)
  const create = useCreateCashMovement()
  const reset = () => {
    setType("DEPOSIT")
    setValue("")
    setObs("")
    setError(null)
  }
  useEffect(() => {
    if (open) reset()
  }, [open])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedValue = Number(value.replace(",", "."))
    if (!Number.isFinite(parsedValue) || parsedValue <= 0)
      return setError("Informe um valor válido.")
    try {
      await create.mutateAsync({
        type,
        value: parsedValue,
        obs: obs.trim() || undefined,
      })
      reset()
      onClose()
    } catch (cause) {
      setError(getApiErrorMessage(cause))
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          reset()
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova movimentação</DialogTitle>
          <DialogDescription>
            Registre uma entrada ou saída manual de dinheiro do caixa.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Tipo">
            <RadioGroup
              className="grid grid-cols-2 gap-2"
              onValueChange={(next) => setType(next as CashMovementType)}
              value={type}
            >
              {Object.entries(types).map(([value, label]) => (
                <label
                  className="flex h-10 cursor-pointer items-center justify-center rounded-xl border border-[#dce3de] bg-input/50 px-3 text-sm font-medium shadow-none transition-colors has-data-checked:border-transparent has-data-checked:bg-primary has-data-checked:text-primary-foreground dark:border-border"
                  key={value}
                >
                  <span className="sr-only">
                    <RadioGroupItem value={value} />
                  </span>
                  {label}
                </label>
              ))}
            </RadioGroup>
          </Field>
          <Field label="Valor">
            <Input
              className="h-10 rounded-xl"
              inputMode="decimal"
              placeholder="0,00"
              value={value}
              onChange={(event) =>
                setValue(
                  event.target.value
                    .replace(/[^0-9,]/g, "")
                    .replace(/(,.*),/g, "$1")
                )
              }
            />
          </Field>
          <Field label="Observação">
            <Textarea
              className="min-h-20 rounded-xl"
              placeholder="Ex.: Troco inicial, depósito do dono..."
              value={obs}
              onChange={(event) => setObs(event.target.value)}
            />
          </Field>
          {error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              className="rounded-xl bg-[#173f31] text-white hover:bg-[#245742]"
              disabled={create.isPending}
              type="submit"
            >
              {create.isPending && (
                <LoaderCircle className="size-4 animate-spin" />
              )}{" "}
              Registrar movimentação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteCashMovementDialog({
  movement,
  onClose,
}: {
  movement: CashMovement | null
  onClose: () => void
}) {
  const remove = useDeleteCashMovement()
  const [error, setError] = useState<string | null>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  useEffect(() => setError(null), [movement])
  async function confirm() {
    if (!movement) return
    try {
      await remove.mutateAsync(movement.id)
      onClose()
    } catch (cause) {
      setError(getApiErrorMessage(cause))
    }
  }
  return (
    <Dialog
      open={Boolean(movement)}
      onOpenChange={(value) => !value && onClose()}
    >
      <DialogContent className="sm:max-w-md" initialFocus={confirmRef}>
        <DialogHeader>
          <DialogTitle>Excluir movimentação?</DialogTitle>
          <DialogDescription>
            {movement && types[movement.type]} de{" "}
            {movement && formatCurrency(movement.value)} será removida
            permanentemente.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button onClick={onClose} type="button" variant="outline">
            Cancelar
          </Button>
          <Button
            ref={confirmRef}
            disabled={remove.isPending}
            onClick={confirm}
            type="button"
            variant="destructive"
          >
            {remove.isPending && (
              <LoaderCircle className="size-4 animate-spin" />
            )}{" "}
            Excluir movimentação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
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
const formatCurrency = (value: string | number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value)
  )
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(value)
  )
