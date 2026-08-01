import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import {
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Minus,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
import { useDebtors } from "@/hooks/debtors/use-debtors"
import { useCurrentUser } from "@/hooks/auth/use-current-user"
import { useProducts } from "@/hooks/products/use-products"
import {
  useCreateSale,
  useDeleteSale,
  useSales,
  useUpdateSale,
} from "@/hooks/sales/use-sales"
import { getApiErrorMessage } from "@/lib/http"
import type { PaymentMethod, Sale, SaleStatus } from "@/services/sales.service"

const pageSize = 20
const statuses: Record<SaleStatus, string> = {
  PAID: "Pago",
  PENDING: "Pendente",
  FREE: "Cortesia",
  DEBT: "A prazo",
  CANCELED: "Cancelada",
}
const paymentMethods: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CARD: "Cartão",
  BANK_TRANSFER: "Transferência",
  OTHER: "Outro",
}
const selectClass =
  "h-10! w-full rounded-xl! border-[#dce3de]! bg-input/50! px-2.5! py-1! text-sm shadow-none data-[size=default]:h-10! dark:border-border!"

export function SalesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<SaleStatus | "">("")
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Sale | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null)
  const sales = useSales({
    page,
    limit: pageSize,
    search: search || undefined,
    status: status || undefined,
  })
  const { data: user } = useCurrentUser()
  const canEdit = ["ADMIN", "MANAGER", "OPERATOR"].includes(user?.role ?? "")
  const canDelete = ["ADMIN", "MANAGER"].includes(user?.role ?? "")

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShoppingCart className="size-4" /> Operação
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
            Vendas
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Registre e acompanhe as saídas da operação.
          </p>
        </div>
        <Button
          className="h-10 rounded-xl bg-[#173f31] text-white hover:bg-[#245742]"
          onClick={() => setOpen(true)}
        >
          <Plus className="size-4" /> Nova venda
        </Button>
      </div>
      <section className="rounded-2xl border border-[#e5e9e4] bg-background dark:border-border">
        <div className="flex flex-col gap-3 border-b border-[#e5e9e4] p-4 sm:flex-row sm:items-center dark:border-border">
          <div className="relative w-full sm:w-[28rem]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 rounded-xl pl-9 shadow-none"
              placeholder="Buscar por cliente"
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
              setStatus(value === "ALL" ? "" : (value as SaleStatus))
              setPage(1)
            }}
          >
            <SelectTrigger className={`${selectClass} sm:w-52`}>
              <span>{status ? statuses[status] : "Todos os status"}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              {Object.entries(statuses).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Cliente</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Criada em</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.isLoading ? (
              <LoadingRows />
            ) : (
              sales.data?.data.map((sale) => (
                <SaleRow
                  canDelete={canDelete}
                  canEdit={canEdit}
                  key={sale.id}
                  onDelete={setDeleteTarget}
                  onEdit={setEditTarget}
                  sale={sale}
                />
              ))
            )}
            {!sales.isLoading && sales.data?.data.length === 0 && (
              <TableRow>
                <TableCell
                  className="h-52 text-center text-muted-foreground"
                  colSpan={6}
                >
                  Nenhuma venda encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Pagination data={sales.data} page={page} setPage={setPage} />
      </section>
      <SaleDialog onClose={() => setOpen(false)} open={open} />
      <SaleDialog onClose={() => setEditTarget(null)} sale={editTarget} />
      <DeleteSaleDialog
        onClose={() => setDeleteTarget(null)}
        sale={deleteTarget}
      />
    </div>
  )
}

function SaleRow({
  sale,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  sale: Sale
  canEdit: boolean
  canDelete: boolean
  onEdit: (sale: Sale) => void
  onDelete: (sale: Sale) => void
}) {
  const styles: Record<SaleStatus, string> = {
    PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    PENDING:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    FREE: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    DEBT: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    CANCELED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  }
  return (
    <TableRow>
      <TableCell className="py-3 pl-5">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground dark:bg-zinc-800 dark:text-zinc-300">
            <ReceiptText className="size-4" />
          </span>
          <div>
            <p className="font-medium">
              {sale.clientName || sale.debtor?.name || "Cliente não informado"}
            </p>
            {sale.debtor && (
              <p className="text-xs text-muted-foreground">
                {sale.debtor.name}
              </p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {sale.items.length} {sale.items.length === 1 ? "item" : "itens"}
      </TableCell>
      <TableCell className="font-medium">{currency(sale.total)}</TableCell>
      <TableCell>
        <Badge className={styles[sale.status]}>{statuses[sale.status]}</Badge>
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        {date(sale.createdAt)}
      </TableCell>
      <TableCell>
        {canEdit && (
          <Button
            aria-label="Editar venda"
            className="text-muted-foreground hover:text-foreground"
            disabled={sale.status === "CANCELED"}
            onClick={() => onEdit(sale)}
            size="icon-sm"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
        )}
        {canDelete && (
          <Button
            aria-label="Excluir venda"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(sale)}
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

type DraftItem = { productId: string; quantity: string; priceUnit: string }
function SaleDialog({
  sale,
  open,
  onClose,
}: {
  sale?: Sale | null
  open?: boolean
  onClose: () => void
}) {
  const [clientName, setClientName] = useState("")
  const [status, setStatus] =
    useState<Exclude<SaleStatus, "CANCELED">>("PENDING")
  const [debtorId, setDebtorId] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PIX")
  const [obs, setObs] = useState("")
  const [items, setItems] = useState<DraftItem[]>([
    { productId: "", quantity: "1", priceUnit: "" },
  ])
  const [error, setError] = useState<string | null>(null)
  const products = useProducts({ page: 1, limit: 100, status: "ACTIVE" })
  const debtors = useDebtors({ page: 1, limit: 100, status: "ACTIVE" })
  const create = useCreateSale()
  const update = useUpdateSale()
  const editing = Boolean(sale)
  const visible = open ?? editing
  const reset = () => {
    setClientName("")
    setStatus("PENDING")
    setDebtorId("")
    setPaymentMethod("PIX")
    setObs("")
    setItems([{ productId: "", quantity: "1", priceUnit: "" }])
    setError(null)
  }
  useEffect(() => {
    if (sale) {
      setClientName(sale.clientName ?? "")
      setStatus(sale.status === "CANCELED" ? "PENDING" : sale.status)
      setDebtorId(sale.debtor?.id ?? "")
      setPaymentMethod(sale.payments?.[0]?.method ?? "PIX")
      setObs(sale.obs ?? "")
      setItems(
        sale.items.map((item) => ({
          productId: item.productId,
          quantity: String(item.quantity).replace(".", ","),
          priceUnit: String(item.priceUnit).replace(".", ","),
        }))
      )
    } else if (open) reset()
    setError(null)
  }, [sale, open])
  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...patch } : item
      )
    )
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payloadItems = items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity.replace(",", ".")),
      ...(item.priceUnit
        ? { priceUnit: Number(item.priceUnit.replace(",", ".")) }
        : {}),
    }))
    if (
      payloadItems.some(
        (item) =>
          !item.productId ||
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0
      )
    )
      return setError("Informe produto e quantidade válida em todos os itens.")
    if (status === "DEBT" && !debtorId)
      return setError("Selecione o devedor para esta venda.")
    try {
      const input = {
        clientName: clientName.trim() || undefined,
        status,
        debtorId: status === "DEBT" ? debtorId : undefined,
        paymentMethod: status === "PAID" ? paymentMethod : undefined,
        obs: obs.trim() || undefined,
        items: payloadItems,
      }
      if (sale) await update.mutateAsync({ id: sale.id, input })
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
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar venda" : "Nova venda"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Atualize os itens e a condição de pagamento."
              : "Adicione os itens e defina a condição de pagamento."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cliente">
              <Input
                className="h-10 rounded-xl"
                placeholder="Nome do cliente"
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
              />
            </Field>
            <Field label="Situação">
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value as Exclude<SaleStatus, "CANCELED">)
                }
              >
                <SelectTrigger className={selectClass}>
                  <span>{statuses[status]}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pendente</SelectItem>
                  <SelectItem value="PAID">Pago</SelectItem>
                  <SelectItem value="DEBT">A prazo</SelectItem>
                  <SelectItem value="FREE">Cortesia</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {status === "DEBT" && (
              <Field label="Devedor">
                <Select
                  value={debtorId}
                  onValueChange={(value) => setDebtorId(value ?? "")}
                >
                  <SelectTrigger className={selectClass}>
                    <span>
                      {debtors.data?.data.find(
                        (debtor) => debtor.id === debtorId
                      )?.name || "Selecione o devedor"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {debtors.data?.data.map((debtor) => (
                      <SelectItem key={debtor.id} value={debtor.id}>
                        {debtor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            {status === "PAID" && (
              <Field label="Pagamento">
                <Select
                  value={paymentMethod}
                  onValueChange={(value) =>
                    setPaymentMethod(value as PaymentMethod)
                  }
                >
                  <SelectTrigger className={selectClass}>
                    <span>{paymentMethods[paymentMethod]}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(paymentMethods).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </div>
          <div className="rounded-xl border border-border p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">Itens da venda</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-lg"
                onClick={() =>
                  setItems((current) => [
                    ...current,
                    { productId: "", quantity: "1", priceUnit: "" },
                  ])
                }
              >
                <Plus className="size-3.5" /> Adicionar
              </Button>
            </div>
            <div className="space-y-3">
              <div className="hidden gap-2 px-0.5 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[1fr_100px_130px_32px]">
                <span>Produto</span>
                <span>Quantidade</span>
                <span>Preço unitário</span>
                <span />
              </div>
              {items.map((item, index) => {
                const selectedProduct = products.data?.data.find(
                  (product) => product.id === item.productId
                )
                return (
                  <div
                    className="grid gap-2 sm:grid-cols-[1fr_100px_130px_32px]"
                    key={index}
                  >
                    <Select
                      value={item.productId}
                      onValueChange={(value) => {
                        const product = products.data?.data.find(
                          (candidate) => candidate.id === value
                        )
                        updateItem(index, {
                          productId: value ?? "",
                          priceUnit: product
                            ? String(product.priceSell).replace(".", ",")
                            : item.priceUnit,
                        })
                      }}
                    >
                      <SelectTrigger className={selectClass}>
                        <span>{selectedProduct?.name || "Selecione o produto"}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {products.data?.data.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      aria-label="Quantidade"
                      className="h-10 rounded-xl"
                      inputMode="decimal"
                      placeholder="Ex.: 2"
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(index, {
                          quantity: event.target.value
                            .replace(/[^0-9,]/g, "")
                            .replace(/(,.*),/g, "$1"),
                        })
                      }
                    />
                    <Input
                      aria-label="Preço unitário"
                      className="h-10 rounded-xl"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={item.priceUnit}
                      onChange={(event) =>
                        updateItem(index, {
                          priceUnit: event.target.value
                            .replace(/[^0-9,]/g, "")
                            .replace(/(,.*),/g, "$1"),
                        })
                      }
                    />
                    <Button
                      aria-label="Remover item"
                      className="self-center"
                      disabled={items.length === 1}
                      onClick={() =>
                        setItems((current) =>
                          current.filter(
                            (_, currentIndex) => currentIndex !== index
                          )
                        )
                      }
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <Minus className="size-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
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
              {editing ? "Salvar alterações" : "Registrar venda"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteSaleDialog({
  sale,
  onClose,
}: {
  sale: Sale | null
  onClose: () => void
}) {
  const remove = useDeleteSale()
  const [error, setError] = useState<string | null>(null)
  useEffect(() => setError(null), [sale])
  async function confirm() {
    if (!sale) return
    try {
      await remove.mutateAsync(sale.id)
      onClose()
    } catch (cause) {
      setError(getApiErrorMessage(cause))
    }
  }
  return (
    <Dialog open={Boolean(sale)} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir venda?</DialogTitle>
          <DialogDescription>
            A venda de{" "}
            {sale?.clientName || sale?.debtor?.name || "cliente não informado"}{" "}
            será removida.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          O estoque dos itens será devolvido automaticamente.
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
            disabled={remove.isPending}
            onClick={confirm}
            type="button"
            variant="destructive"
          >
            {remove.isPending && (
              <LoaderCircle className="size-4 animate-spin" />
            )}{" "}
            Excluir venda
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
function LoadingRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell colSpan={5}>
            <div className="h-8 animate-pulse rounded bg-muted" />
          </TableCell>
        </TableRow>
      ))}
    </>
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
      <span>{data?.total ?? 0} vendas</span>
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
const currency = (value: string | number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value)
  )
const date = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(value)
  )
