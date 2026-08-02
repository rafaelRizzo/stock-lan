import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import {
  Ban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Factory,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useCurrentUser } from "@/hooks/auth/use-current-user"
import { useProducts } from "@/hooks/products/use-products"
import { useQuantityTypes } from "@/hooks/quantity-types/use-quantity-types"
import { useRecipe } from "@/hooks/production/use-recipes"
import {
  useCancelProductionOrder,
  useCreateProductionOrder,
  useProductionOrders,
  useUpdateProductionOrder,
} from "@/hooks/production/use-production-orders"
import { useProductStock } from "@/hooks/stock/use-stock-batches"
import { DEFAULT_PAGE_SIZE } from "@/lib/constants"
import { getApiErrorMessage } from "@/lib/http"
import type {
  ProductionOrder,
  ProductionOrderStatus,
} from "@/services/production.service"

const pageSize = DEFAULT_PAGE_SIZE
const selectClass =
  "h-10! w-full rounded-xl! border-[#dce3de]! bg-input/50! px-2.5! py-1! text-sm shadow-none data-[size=default]:h-10! dark:border-border!"
const statusLabels: Record<ProductionOrderStatus, string> = {
  ACTIVE: "Ativa",
  INACTIVE: "Inativa",
  ARCHIVED: "Cancelada",
}

export function ProductionOrdersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<ProductionOrderStatus | "">("")
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ProductionOrder | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ProductionOrder | null>(null)
  const orders = useProductionOrders({
    page,
    limit: pageSize,
    search: search || undefined,
    status: status || undefined,
  })
  const { data: user } = useCurrentUser()
  const canManage = ["ADMIN", "MANAGER", "OPERATOR"].includes(user?.role ?? "")
  const canCancel = user?.role === "ADMIN" || user?.role === "MANAGER"

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Factory className="size-4" /> Produção
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
            Ordens de produção
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Converta insumos em produtos finais com base na receita cadastrada.
          </p>
        </div>
        {canManage && (
          <Button
            className="h-10 rounded-xl bg-[#173f31] text-white hover:bg-[#245742]"
            onClick={() => setOpen(true)}
          >
            <Plus className="size-4" /> Nova ordem
          </Button>
        )}
      </div>
      <section className="rounded-2xl border border-[#e5e9e4] bg-background dark:border-border">
        <div className="flex flex-col gap-3 border-b border-[#e5e9e4] p-4 sm:flex-row sm:items-center dark:border-border">
          <div className="relative w-full sm:w-[28rem]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 rounded-xl pl-9 shadow-none"
              placeholder="Buscar produto final"
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
              setStatus(value === "ALL" ? "" : (value as ProductionOrderStatus))
              setPage(1)
            }}
          >
            <SelectTrigger className={`${selectClass} sm:w-52`}>
              <span>{status ? statusLabels[status] : "Todos os status"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              <SelectItem value="ACTIVE">Ativa</SelectItem>
              <SelectItem value="ARCHIVED">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Produto final</TableHead>
              <TableHead>Quantidade produzida</TableHead>
              <TableHead>Custo unitário</TableHead>
              <TableHead className="hidden md:table-cell">Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.isLoading ? (
              <TableSkeletonRows
                columns={[
                  { className: "py-3 pl-5", variant: "avatar", width: "w-40" },
                  { width: "w-24" },
                  { width: "w-20" },
                  { className: "hidden md:table-cell", width: "w-24" },
                  { variant: "badge", width: "w-16" },
                  { variant: "actions" },
                ]}
              />
            ) : (
              orders.data?.data.map((order) => (
                <OrderRow
                  canCancel={canCancel}
                  canManage={canManage}
                  key={order.id}
                  onCancel={setCancelTarget}
                  onEdit={setEditTarget}
                  order={order}
                />
              ))
            )}
            {!orders.isLoading && orders.data?.data.length === 0 && (
              <TableRow>
                <TableCell
                  className="h-52 text-center text-muted-foreground"
                  colSpan={6}
                >
                  Nenhuma ordem de produção encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Pagination data={orders.data} page={page} setPage={setPage} />
      </section>
      <OrderDialog onClose={() => setOpen(false)} open={open} />
      <OrderDialog onClose={() => setEditTarget(null)} order={editTarget} />
      <CancelOrderDialog
        onClose={() => setCancelTarget(null)}
        order={cancelTarget}
      />
    </div>
  )
}

function OrderRow({
  order,
  canManage,
  canCancel,
  onEdit,
  onCancel,
}: {
  order: ProductionOrder
  canManage: boolean
  canCancel: boolean
  onEdit: (order: ProductionOrder) => void
  onCancel: (order: ProductionOrder) => void
}) {
  const styles: Record<ProductionOrderStatus, string> = {
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
            <Factory className="size-4" />
          </span>
          <p className="font-medium">{order.finishedProduct.name}</p>
        </div>
      </TableCell>
      <TableCell>
        {number(order.quantityProduced)} {order.quantityType.name}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {currency(order.costUnit)}
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        {date(order.dateProduced)}
      </TableCell>
      <TableCell>
        <Badge className={styles[order.status]}>
          {statusLabels[order.status]}
        </Badge>
      </TableCell>
      <TableCell>
        {order.status === "ACTIVE" && canManage && (
          <Button
            aria-label={`Editar ordem de ${order.finishedProduct.name}`}
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(order)}
            size="icon-sm"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
        )}
        {order.status === "ACTIVE" && canCancel && (
          <Button
            aria-label={`Cancelar ordem de ${order.finishedProduct.name}`}
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onCancel(order)}
            size="icon-sm"
            variant="ghost"
          >
            <Ban className="size-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

function OrderDialog({
  order,
  open,
  onClose,
}: {
  order?: ProductionOrder | null
  open?: boolean
  onClose: () => void
}) {
  const [finishedProductId, setFinishedProductId] = useState("")
  const [quantityTypeId, setQuantityTypeId] = useState("")
  const [quantityProduced, setQuantityProduced] = useState("")
  const [dateProduced, setDateProduced] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [obs, setObs] = useState("")
  const [error, setError] = useState<string | null>(null)
  const products = useProducts({ page: 1, limit: 100, status: "ACTIVE" })
  const quantityTypes = useQuantityTypes({
    page: 1,
    limit: 100,
    status: "ACTIVE",
  })
  const recipe = useRecipe(finishedProductId || undefined)
  const create = useCreateProductionOrder()
  const update = useUpdateProductionOrder()
  const editing = Boolean(order)
  const visible = open ?? editing
  const finishedProducts = products.data?.data.filter(
    (product) => product.type !== "RAW_MATERIAL"
  )
  const reset = () => {
    setFinishedProductId("")
    setQuantityTypeId("")
    setQuantityProduced("")
    setDateProduced(new Date().toISOString().slice(0, 10))
    setObs("")
    setError(null)
  }
  useEffect(() => {
    if (order) {
      setFinishedProductId(order.finishedProductId)
      setQuantityTypeId(order.quantityTypeId)
      setQuantityProduced(String(order.quantityProduced).replace(".", ","))
      setDateProduced(order.dateProduced.slice(0, 10))
      setObs(order.obs ?? "")
    } else if (open) reset()
    setError(null)
  }, [order, open])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const quantity = Number(quantityProduced.replace(",", "."))
    if (!finishedProductId || !quantityTypeId || quantity <= 0 || !dateProduced)
      return setError(
        "Preencha produto final, unidade, quantidade e data de produção."
      )
    try {
      const input = {
        finishedProductId,
        quantityTypeId,
        quantityProduced: quantity,
        dateProduced: new Date(`${dateProduced}T12:00:00`),
        obs: obs.trim() || undefined,
      }
      if (order) await update.mutateAsync({ id: order.id, input })
      else await create.mutateAsync(input)
      reset()
      onClose()
    } catch (cause) {
      setError(getApiErrorMessage(cause))
    }
  }
  return (
    <Dialog
      onOpenChange={(value) => {
        if (!value) {
          reset()
          onClose()
        }
      }}
      open={visible}
    >
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar ordem de produção" : "Nova ordem de produção"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Recalcula o consumo de insumos com base na nova quantidade."
              : "Consome os insumos da receita e gera um lote do produto final."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Produto final">
            <Select
              onValueChange={(value) => setFinishedProductId(value ?? "")}
              value={finishedProductId}
            >
              <SelectTrigger className={selectClass}>
                <span>
                  {finishedProducts?.find(
                    (item) => item.id === finishedProductId
                  )?.name || "Selecione o produto final"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {finishedProducts?.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quantidade produzida">
              <Input
                className="h-10 rounded-xl"
                inputMode="decimal"
                onChange={(event) =>
                  setQuantityProduced(
                    event.target.value
                      .replace(/[^0-9,]/g, "")
                      .replace(/(,.*),/g, "$1")
                  )
                }
                placeholder="0"
                value={quantityProduced}
              />
            </Field>
            <Field label="Unidade do lote gerado">
              <Select
                onValueChange={(value) => setQuantityTypeId(value ?? "")}
                value={quantityTypeId}
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
            <Field label="Data de produção">
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
                      new Date(`${dateProduced}T12:00:00`),
                      "dd 'de' MMMM 'de' yyyy",
                      { locale: ptBR }
                    )}
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      locale={ptBR}
                      mode="single"
                      onSelect={(value) =>
                        value && setDateProduced(format(value, "yyyy-MM-dd"))
                      }
                      selected={new Date(`${dateProduced}T12:00:00`)}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </Field>
          </div>
          {finishedProductId && (
            <RecipePreview
              quantityProduced={Number(quantityProduced.replace(",", ".")) || 0}
              recipe={recipe.data}
            />
          )}
          <Field label="Observação">
            <Textarea
              className="min-h-20 rounded-xl"
              onChange={(event) => setObs(event.target.value)}
              placeholder="Opcional"
              value={obs}
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
              {editing ? "Salvar alterações" : "Confirmar produção"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RecipePreview({
  recipe,
  quantityProduced,
}: {
  recipe?: Array<{
    id: string
    rawProductId: string
    quantityPerUnit: string | number
    rawProduct: { name: string }
  }>
  quantityProduced: number
}) {
  if (!recipe) return null
  if (!recipe.length)
    return (
      <p className="rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-300">
        Este produto ainda não possui receita cadastrada.
      </p>
    )
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="mb-2 text-sm font-medium">Insumos necessários</p>
      <div className="space-y-1.5">
        {recipe.map((item) => (
          <IngredientPreviewRow
            key={item.id}
            item={item}
            quantityProduced={quantityProduced}
          />
        ))}
      </div>
    </div>
  )
}

function IngredientPreviewRow({
  item,
  quantityProduced,
}: {
  item: {
    rawProductId: string
    quantityPerUnit: string | number
    rawProduct: { name: string }
  }
  quantityProduced: number
}) {
  const stock = useProductStock(item.rawProductId)
  const required = Number(item.quantityPerUnit) * quantityProduced
  const available = Number(stock.data?.available ?? 0)
  const insufficient = stock.data !== undefined && available < required
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{item.rawProduct.name}</span>
      <span
        className={
          insufficient ? "font-medium text-destructive" : "text-muted-foreground"
        }
      >
        {number(required)} necessário · {number(available)} disponível
      </span>
    </div>
  )
}

function CancelOrderDialog({
  order,
  onClose,
}: {
  order: ProductionOrder | null
  onClose: () => void
}) {
  const cancel = useCancelProductionOrder()
  const [error, setError] = useState<string | null>(null)
  useEffect(() => setError(null), [order])
  async function confirm() {
    if (!order) return
    try {
      await cancel.mutateAsync(order.id)
      onClose()
    } catch (cause) {
      setError(getApiErrorMessage(cause))
    }
  }
  return (
    <Dialog onOpenChange={(value) => !value && onClose()} open={Boolean(order)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar ordem de produção?</DialogTitle>
          <DialogDescription>
            Os insumos consumidos por {order?.finishedProduct.name} serão
            devolvidos ao estoque.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button onClick={onClose} type="button" variant="outline">
            Voltar
          </Button>
          <Button
            disabled={cancel.isPending}
            onClick={confirm}
            type="button"
            variant="destructive"
          >
            {cancel.isPending && (
              <LoaderCircle className="size-4 animate-spin" />
            )}{" "}
            Cancelar ordem
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
      <span>{data?.total ?? 0} ordens</span>
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
