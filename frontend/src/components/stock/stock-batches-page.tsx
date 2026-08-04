import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { SearchableSelect } from "@/components/shared/searchable-select"
import { DateRangePicker } from "@/components/shared/date-range-picker"
import { TableSkeletonRows } from "@/components/shared/table-skeleton"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useProducts } from "@/hooks/products/use-products"
import { useQuantityTypes } from "@/hooks/quantity-types/use-quantity-types"
import { useCurrentUser } from "@/hooks/auth/use-current-user"
import {
  useCreateStockBatch,
  useDeleteStockBatch,
  useStockBatches,
  useUpdateStockBatch,
} from "@/hooks/stock/use-stock-batches"
import { useSuppliers } from "@/hooks/suppliers/use-suppliers"
import { DEFAULT_PAGE_SIZE } from "@/lib/constants"
import { getApiErrorMessage } from "@/lib/http"
import type { BatchStatus, StockBatch } from "@/services/stock.service"

const pageSize = DEFAULT_PAGE_SIZE
const selectClass =
  "h-10! w-full rounded-xl! border-[#dce3de]! bg-input/50! px-2.5! py-1! text-sm shadow-none data-[size=default]:h-10! dark:border-border!"
const statusLabels: Record<BatchStatus, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  ARCHIVED: "Arquivado",
}

export function StockBatchesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<BatchStatus | "">("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<StockBatch | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StockBatch | null>(null)
  const batches = useStockBatches({
    page,
    limit: pageSize,
    search: search || undefined,
    status: status || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  })
  const { data: user } = useCurrentUser()
  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER"
  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <PackagePlus className="size-4" /> Operação
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
            Entradas
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Registre compras e acompanhe os lotes recebidos.
          </p>
        </div>
        <Button
          className="h-10 rounded-xl bg-[#173f31] text-white hover:bg-[#245742]"
          onClick={() => setOpen(true)}
        >
          <Plus className="size-4" /> Nova entrada
        </Button>
      </div>
      <section className="rounded-2xl border border-[#e5e9e4] bg-background dark:border-border">
        <div className="flex flex-col gap-3 border-b border-[#e5e9e4] p-4 sm:flex-row sm:items-center dark:border-border">
          <div className="relative w-full sm:w-[28rem]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 rounded-xl pl-9 text-sm shadow-none"
              placeholder="Buscar produto ou fornecedor"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
          </div>
          <Select
            value={status || "ALL"}
            onValueChange={(value) => {
              setStatus(value === "ALL" ? "" : (value as BatchStatus))
              setPage(1)
            }}
          >
            <SelectTrigger className={`${selectClass} sm:w-52`}>
              <span>{status ? statusLabels[status] : "Todos os status"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
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
              <TableHead className="pl-5">Produto</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Entrada</TableHead>
              <TableHead>Restante</TableHead>
              <TableHead className="hidden md:table-cell">Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.isLoading ? (
              <TableSkeletonRows
                columns={[
                  { className: "py-3 pl-5", variant: "avatar", width: "w-40" },
                  { width: "w-24" },
                  { width: "w-16" },
                  { width: "w-16" },
                  { className: "hidden md:table-cell", width: "w-24" },
                  { variant: "badge", width: "w-16" },
                  { variant: "actions" },
                ]}
              />
            ) : (
              batches.data?.data.map((batch) => (
                <BatchRow
                  batch={batch}
                  canManage={canManage}
                  key={batch.id}
                  onDelete={setDeleteTarget}
                  onEdit={setEditTarget}
                />
              ))
            )}
            {!batches.isLoading && batches.data?.data.length === 0 && (
              <TableRow>
                <TableCell
                  className="h-52 text-center text-muted-foreground"
                  colSpan={7}
                >
                  Nenhuma entrada encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Pagination data={batches.data} page={page} setPage={setPage} />
      </section>
      <EntryDialog onClose={() => setOpen(false)} open={open} />
      <EntryDialog batch={editTarget} onClose={() => setEditTarget(null)} />
      <DeleteEntryDialog
        batch={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function BatchRow({
  batch,
  canManage,
  onDelete,
  onEdit,
}: {
  batch: StockBatch
  canManage: boolean
  onDelete: (batch: StockBatch) => void
  onEdit: (batch: StockBatch) => void
}) {
  const styles: Record<BatchStatus, string> = {
    ACTIVE:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    INACTIVE:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    ARCHIVED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  }
  return (
    <TableRow>
      <TableCell className="py-3 pl-5">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground dark:bg-zinc-800 dark:text-zinc-300">
            <PackagePlus className="size-4" />
          </span>
          <div>
            <p className="font-medium">{batch.product.name}</p>
            <p className="text-xs text-muted-foreground">
              {currency(batch.priceBuy)} por unidade
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {batch.supplier?.name || "-"}
      </TableCell>
      <TableCell>
        {number(batch.quantityIn)} {batch.quantityType.name}
      </TableCell>
      <TableCell className="font-medium">
        {number(batch.quantityLeft)} {batch.quantityType.name}
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        {date(batch.dateBuy)}
      </TableCell>
      <TableCell>
        <Badge className={styles[batch.status]}>
          {statusLabels[batch.status]}
        </Badge>
      </TableCell>
      <TableCell>
        {canManage && (
          <>
            <Button
              aria-label={`Editar ${batch.product.name}`}
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(batch)}
              size="icon-sm"
              variant="ghost"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              aria-label={`Excluir ${batch.product.name}`}
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(batch)}
              size="icon-sm"
              variant="ghost"
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        )}
      </TableCell>
    </TableRow>
  )
}

function EntryDialog({
  batch,
  open,
  onClose,
}: {
  batch?: StockBatch | null
  open?: boolean
  onClose: () => void
}) {
  const [productId, setProductId] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [quantityTypeId, setQuantityTypeId] = useState("")
  const [quantityIn, setQuantityIn] = useState("")
  const [priceBuy, setPriceBuy] = useState("")
  const [dateBuy, setDateBuy] = useState(new Date().toISOString().slice(0, 10))
  const [notifyLimit, setNotifyLimit] = useState(false)
  const [quantityNotify, setQuantityNotify] = useState("")
  const [obs, setObs] = useState("")
  const [error, setError] = useState<string | null>(null)
  const products = useProducts({ page: 1, limit: 100, status: "ACTIVE" })
  const suppliers = useSuppliers({ page: 1, limit: 100, status: "ACTIVE" })
  const quantityTypes = useQuantityTypes({
    page: 1,
    limit: 100,
    status: "ACTIVE",
  })
  const productOptions = useMemo(
    () =>
      products.data?.data.map((item) => ({
        value: item.id,
        label: item.name,
      })) ?? [],
    [products.data]
  )
  const supplierOptions = useMemo(
    () =>
      suppliers.data?.data.map((item) => ({
        value: item.id,
        label: item.name,
      })) ?? [],
    [suppliers.data]
  )
  const create = useCreateStockBatch()
  const update = useUpdateStockBatch()
  const editing = Boolean(batch)
  const visible = open ?? editing
  const reset = () => {
    setProductId("")
    setSupplierId("")
    setQuantityTypeId("")
    setQuantityIn("")
    setPriceBuy("")
    setDateBuy(new Date().toISOString().slice(0, 10))
    setNotifyLimit(false)
    setQuantityNotify("")
    setObs("")
    setError(null)
  }
  useEffect(() => {
    if (batch) {
      setProductId(batch.product.id)
      setSupplierId(batch.supplier?.id ?? "")
      setQuantityTypeId(batch.quantityType.id)
      setQuantityIn(String(batch.quantityIn).replace(".", ","))
      setPriceBuy(String(batch.priceBuy).replace(".", ","))
      setDateBuy(batch.dateBuy.slice(0, 10))
      setNotifyLimit(batch.notifyLimit)
      setQuantityNotify(
        batch.quantityNotify === null
          ? ""
          : String(batch.quantityNotify).replace(".", ",")
      )
      setObs(batch.obs ?? "")
    } else if (open) reset()
    setError(null)
  }, [batch, open])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const quantity = Number(quantityIn.replace(",", "."))
    const price = Number(priceBuy.replace(",", "."))
    const notifyQuantity = Number(quantityNotify.replace(",", "."))
    if (
      !productId ||
      !supplierId ||
      !quantityTypeId ||
      quantity <= 0 ||
      price <= 0 ||
      !dateBuy
    )
      return setError(
        "Preencha produto, fornecedor, unidade, quantidade, custo e data."
      )
    if (notifyLimit && notifyQuantity <= 0)
      return setError("Informe a quantidade mínima para o alerta.")
    try {
      const input = {
        productId,
        supplierId,
        quantityTypeId,
        quantityIn: quantity,
        priceBuy: price,
        dateBuy: new Date(`${dateBuy}T12:00:00`),
        notifyLimit,
        quantityNotify: notifyLimit ? notifyQuantity : undefined,
        obs: obs.trim() || undefined,
      }
      if (batch) await update.mutateAsync({ id: batch.id, input })
      else await create.mutateAsync(input)
      reset()
      onClose()
    } catch (cause) {
      setError(getApiErrorMessage(cause))
    }
  }
  return (
    <Dialog
      open={visible}
      onOpenChange={(value) => {
        if (!value) {
          reset()
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar entrada" : "Nova entrada"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Atualize os dados do lote."
              : "Adicione um lote ao estoque disponível."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Produto">
            <SearchableSelect
              className={selectClass}
              items={productOptions}
              onValueChange={setProductId}
              placeholder="Selecione o produto"
              value={productId}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fornecedor">
              <SearchableSelect
                className={selectClass}
                items={supplierOptions}
                onValueChange={setSupplierId}
                placeholder="Selecione"
                value={supplierId}
              />
            </Field>
            <Field label="Unidade">
              <Select
                value={quantityTypeId}
                onValueChange={(value) => setQuantityTypeId(value ?? "")}
              >
                <SelectTrigger className={selectClass}>
                  <span>
                    {quantityTypes.data?.data.find(
                      (item) => item.id === quantityTypeId
                    )?.name || "Selecione"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {quantityTypes.data?.data.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Quantidade">
              <Input
                className="h-10 rounded-xl"
                inputMode="decimal"
                placeholder="0"
                value={quantityIn}
                onChange={(event) =>
                  setQuantityIn(
                    event.target.value
                      .replace(/[^0-9,]/g, "")
                      .replace(/(,.*),/g, "$1")
                  )
                }
              />
            </Field>
            <Field label="Custo por unidade">
              <Input
                className="h-10 rounded-xl"
                inputMode="decimal"
                placeholder="0,00"
                value={priceBuy}
                onChange={(event) =>
                  setPriceBuy(
                    event.target.value
                      .replace(/[^0-9,]/g, "")
                      .replace(/(,.*),/g, "$1")
                  )
                }
              />
            </Field>
            <Field label="Data de compra">
              <div className="h-10">
                <Popover modal>
                  <PopoverTrigger
                    render={
                      <Button
                        className="h-10 w-full justify-start rounded-xl border-[#dce3de] bg-input/50 px-3 text-left font-normal shadow-none hover:bg-input/70 dark:border-border dark:bg-input/50 dark:hover:bg-input/70"
                        type="button"
                        variant="outline"
                      />
                    }
                  >
                    <CalendarDays className="mr-2 size-4 text-muted-foreground" />
                    {format(
                      new Date(`${dateBuy}T12:00:00`),
                      "dd 'de' MMMM 'de' yyyy",
                      { locale: ptBR }
                    )}
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      locale={ptBR}
                      mode="single"
                      onSelect={(value) =>
                        value && setDateBuy(format(value, "yyyy-MM-dd"))
                      }
                      selected={new Date(`${dateBuy}T12:00:00`)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </Field>
          </div>
          <div className="rounded-xl border border-[#dce3de] p-4 dark:border-border">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="notify-limit">Alertar estoque baixo</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Exibe este lote quando o saldo atingir o limite definido.
                </p>
              </div>
              <Switch
                checked={notifyLimit}
                id="notify-limit"
                onCheckedChange={setNotifyLimit}
              />
            </div>
            {notifyLimit && (
              <div className="mt-4 max-w-56">
                <Label htmlFor="quantity-notify">Quantidade mínima</Label>
                <Input
                  className="mt-2 h-10 rounded-xl"
                  id="quantity-notify"
                  inputMode="decimal"
                  placeholder="0"
                  value={quantityNotify}
                  onChange={(event) =>
                    setQuantityNotify(
                      event.target.value
                        .replace(/[^0-9,]/g, "")
                        .replace(/(,.*),/g, "$1")
                    )
                  }
                />
              </div>
            )}
          </div>
          <Field label="Observação">
            <Textarea
              className="min-h-20 rounded-xl"
              placeholder="Opcional"
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
              disabled={create.isPending || update.isPending}
              type="submit"
            >
              {(create.isPending || update.isPending) && (
                <LoaderCircle className="size-4 animate-spin" />
              )}{" "}
              {editing ? "Salvar alterações" : "Registrar entrada"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteEntryDialog({
  batch,
  onClose,
}: {
  batch: StockBatch | null
  onClose: () => void
}) {
  const remove = useDeleteStockBatch()
  const [error, setError] = useState<string | null>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  useEffect(() => setError(null), [batch])
  async function confirm() {
    if (!batch) return
    try {
      await remove.mutateAsync(batch.id)
      onClose()
    } catch (cause) {
      setError(getApiErrorMessage(cause))
    }
  }
  return (
    <Dialog open={Boolean(batch)} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-md" initialFocus={confirmRef}>
        <DialogHeader>
          <DialogTitle>Excluir entrada?</DialogTitle>
          <DialogDescription>
            O lote de {batch?.product.name} será removido do estoque.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Entradas com movimentações posteriores não podem ser excluídas.
        </p>
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
            Excluir entrada
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
      <span>{data?.total ?? 0} entradas</span>
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
    Number(value)
  )
const currency = (value: string | number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value)
  )
const date = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(value)
  )
