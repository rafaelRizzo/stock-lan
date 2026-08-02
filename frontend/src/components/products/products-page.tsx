import { useEffect, useState, type FormEvent } from "react"
import {
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Box,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PermanentDeleteDialog } from "@/components/shared/permanent-delete-dialog"
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
  useArchiveProduct,
  useCreateProduct,
  useDeleteProduct,
  useProducts,
  useRestoreProduct,
  useUpdateProduct,
} from "@/hooks/products/use-products"
import { useCurrentUser } from "@/hooks/auth/use-current-user"
import { DEFAULT_PAGE_SIZE, PRODUCT_TYPE_LABELS } from "@/lib/constants"
import { getApiErrorMessage } from "@/lib/http"
import type { Product, ProductStatus, ProductType } from "@/services/products.service"

const pageSize = DEFAULT_PAGE_SIZE
const statusLabels = {
  ACTIVE: "Ativos",
  INACTIVE: "Inativos",
  ARCHIVED: "Arquivados",
}

export function ProductsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<ProductStatus | "">("")
  const [stockOrder, setStockOrder] = useState<"asc" | "desc" | undefined>()
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<Product | null>(null)
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const products = useProducts({
    page,
    limit: pageSize,
    search: search || undefined,
    status: status || undefined,
    includeArchived: !status,
    stockOrder,
  })
  const archive = useArchiveProduct()
  const restore = useRestoreProduct()
  const remove = useDeleteProduct()
  const { data: user } = useCurrentUser()
  const canCreate = user?.role === "ADMIN" || user?.role === "MANAGER"
  const canArchive = user?.role === "ADMIN"
  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Box className="size-4" /> Cadastros
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
            Produtos
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Organize os produtos disponíveis para venda.
          </p>
        </div>
        {canCreate && (
          <Button
            className="h-10 rounded-xl bg-[#173f31] text-white hover:bg-[#245742]"
            onClick={() => setOpen(true)}
          >
            <Plus className="size-4" /> Novo produto
          </Button>
        )}
      </div>
      <section className="rounded-2xl border border-[#e5e9e4] bg-background dark:border-border">
        <div className="flex flex-col gap-3 border-b border-[#e5e9e4] p-4 sm:flex-row sm:items-center dark:border-border">
          <div className="relative w-full sm:w-[28rem]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 rounded-xl pl-9 shadow-none"
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Buscar produto"
              value={search}
            />
          </div>
          <StatusSelect
            onChange={(value) => {
              setStatus(value)
              setPage(1)
            }}
            value={status}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Produto</TableHead>
              <TableHead>Preço de venda</TableHead>
              <TableHead>
                <Button
                  aria-label="Ordenar por estoque"
                  className="-ml-3 h-7 rounded-lg px-3 font-medium"
                  onClick={() => {
                    setStockOrder((current) =>
                      current === "desc"
                        ? "asc"
                        : current === "asc"
                          ? undefined
                          : "desc"
                    )
                    setPage(1)
                  }}
                  size="sm"
                  variant="ghost"
                >
                  Em estoque
                  {stockOrder === "asc" ? (
                    <ArrowUp className="size-3.5" />
                  ) : stockOrder === "desc" ? (
                    <ArrowDown className="size-3.5" />
                  ) : (
                    <ArrowUpDown className="size-3.5 text-muted-foreground" />
                  )}
                </Button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Criado em</TableHead>
              <TableHead className="w-14" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.isLoading && (
              <TableSkeletonRows
                columns={[
                  { className: "py-3 pl-5", variant: "avatar", width: "w-40" },
                  { width: "w-20" },
                  { width: "w-16" },
                  { variant: "badge", width: "w-16" },
                  { className: "hidden md:table-cell", width: "w-24" },
                  { variant: "actions" },
                ]}
              />
            )}
            {!products.isLoading &&
              products.data?.data.map((product) => (
                <ProductRow
                  canArchive={canArchive}
                  canEdit={canCreate}
                  key={product.id}
                  onArchive={setTarget}
                  onDelete={setDeleteTarget}
                  onEdit={setEditTarget}
                  onRestore={(item) => restore.mutate(item.id)}
                  product={product}
                  restoring={restore.isPending}
                />
              ))}
            {!products.isLoading && products.data?.data.length === 0 && (
              <TableRow>
                <TableCell
                  className="h-52 text-center text-muted-foreground"
                  colSpan={6}
                >
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-[#e5e9e4] p-4 text-sm dark:border-border">
          <span className="text-muted-foreground">
            {products.data?.total ?? 0} produto
            {products.data?.total === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              aria-label="Página anterior"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              size="icon-sm"
              variant="outline"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Página {page} de {products.data?.totalPage ?? 1}
            </span>
            <Button
              aria-label="Próxima página"
              disabled={!products.data || page >= products.data.totalPage}
              onClick={() => setPage((value) => value + 1)}
              size="icon-sm"
              variant="outline"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>
      <CreateProductDialog onOpenChange={setOpen} open={open} />
      <EditProductDialog
        onClose={() => setEditTarget(null)}
        product={editTarget}
      />
      <ArchiveProductDialog
        onClose={() => setTarget(null)}
        onConfirm={() =>
          target &&
          archive.mutate(target.id, { onSuccess: () => setTarget(null) })
        }
        pending={archive.isPending}
        product={target}
      />
      <PermanentDeleteDialog
        name={deleteTarget?.name}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteTarget ? remove.mutateAsync(deleteTarget.id) : Promise.resolve()
        }
        open={Boolean(deleteTarget)}
        resource="produto"
      />
    </div>
  )
}

function StatusSelect({
  onChange,
  value,
}: {
  onChange: (value: ProductStatus | "") => void
  value: ProductStatus | ""
}) {
  return (
    <Select
      onValueChange={(next) =>
        onChange(next === "ALL" ? "" : (next as ProductStatus))
      }
      value={value || "ALL"}
    >
      <SelectTrigger className="h-10! w-full rounded-xl! border-[#dce3de]! bg-input/50! px-2.5! py-1! text-sm shadow-none data-[size=default]:h-10! sm:w-52 dark:border-border!">
        <span>{value ? statusLabels[value] : "Todos os status"}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">Todos os status</SelectItem>
        <SelectItem value="ACTIVE">Ativos</SelectItem>
        <SelectItem value="INACTIVE">Inativos</SelectItem>
        <SelectItem value="ARCHIVED">Arquivados</SelectItem>
      </SelectContent>
    </Select>
  )
}
function ProductTypeSelect({
  onChange,
  value,
}: {
  onChange: (value: ProductType) => void
  value: ProductType
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      Tipo
      <Select onValueChange={(next) => onChange(next as ProductType)} value={value}>
        <SelectTrigger className="h-10! w-full rounded-xl! border-[#dce3de]! bg-background! shadow-none dark:border-border!">
          <span>{PRODUCT_TYPE_LABELS[value]}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="BOTH">{PRODUCT_TYPE_LABELS.BOTH}</SelectItem>
          <SelectItem value="FINISHED">{PRODUCT_TYPE_LABELS.FINISHED}</SelectItem>
          <SelectItem value="RAW_MATERIAL">{PRODUCT_TYPE_LABELS.RAW_MATERIAL}</SelectItem>
        </SelectContent>
      </Select>
    </label>
  )
}
function ProductRow({
  canArchive,
  canEdit,
  onArchive,
  onDelete,
  onEdit,
  onRestore,
  product,
  restoring,
}: {
  canArchive: boolean
  canEdit: boolean
  onArchive: (product: Product) => void
  onDelete: (product: Product) => void
  onEdit: (product: Product) => void
  onRestore: (product: Product) => void
  product: Product
  restoring: boolean
}) {
  return (
    <TableRow>
      <TableCell className="py-3 pl-5">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground dark:bg-zinc-800 dark:text-zinc-300">
            <Tag className="size-4" />
          </span>
          <div>
            <p className="font-medium">{product.name}</p>
            {product.type !== "BOTH" && (
              <p className="text-xs text-muted-foreground">
                {PRODUCT_TYPE_LABELS[product.type]}
              </p>
            )}
            {product.obs && (
              <p className="max-w-64 truncate text-xs text-muted-foreground">
                {product.obs}
              </p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="font-medium">
        {product.priceSell === null ? (
          <span className="text-muted-foreground">-</span>
        ) : (
          formatCurrency(product.priceSell)
        )}
      </TableCell>
      <TableCell className="font-medium">
        {formatQuantity(product.stockQuantity ?? 0)}
      </TableCell>
      <TableCell>
        <StatusBadge status={product.status} />
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
          new Date(product.createdAt)
        )}
      </TableCell>
      <TableCell>
        {canEdit && (
          <Button
            aria-label={`Editar ${product.name}`}
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(product)}
            size="icon-sm"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
        )}
        {canArchive && product.status === "ARCHIVED" && (
          <Button
            aria-label={`Restaurar ${product.name}`}
            className="text-muted-foreground hover:text-foreground"
            disabled={restoring}
            onClick={() => onRestore(product)}
            size="icon-sm"
            variant="ghost"
          >
            <ArchiveRestore className="size-4" />
          </Button>
        )}
        {canArchive && product.status !== "ARCHIVED" && (
          <Button
            aria-label={`Arquivar ${product.name}`}
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onArchive(product)}
            size="icon-sm"
            variant="ghost"
          >
            <Archive className="size-4" />
          </Button>
        )}
        {canArchive && (
          <Button
            aria-label={`Excluir ${product.name}`}
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(product)}
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
function StatusBadge({ status }: { status: ProductStatus }) {
  const styles = {
    ACTIVE:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    INACTIVE:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    ARCHIVED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  }
  const labels = { ACTIVE: "Ativo", INACTIVE: "Inativo", ARCHIVED: "Arquivado" }
  return <Badge className={styles[status]}>{labels[status]}</Badge>
}
function CreateProductDialog({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [type, setType] = useState<ProductType>("BOTH")
  const [obs, setObs] = useState("")
  const [error, setError] = useState<string | null>(null)
  const create = useCreateProduct()
  const isRawMaterial = type === "RAW_MATERIAL"
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const priceSell = Number(price.replace(",", "."))
    if (!name.trim()) return setError("Preencha o nome do produto.")
    if (!isRawMaterial && (!price || !Number.isFinite(priceSell) || priceSell <= 0))
      return setError("Informe um preço de venda válido.")
    setError(null)
    try {
      await create.mutateAsync({
        name: name.trim(),
        priceSell: isRawMaterial ? undefined : priceSell,
        type,
        obs: obs.trim() || undefined,
      })
      setName("")
      setPrice("")
      setType("BOTH")
      setObs("")
      onOpenChange(false)
    } catch (reason) {
      setError(getApiErrorMessage(reason))
    }
  }
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo produto</DialogTitle>
          <DialogDescription>
            Cadastre o produto e o preço de venda padrão.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <ProductInput
            label="Nome"
            onChange={setName}
            placeholder="Nome do produto"
            value={name}
          />
          <ProductTypeSelect onChange={setType} value={type} />
          {!isRawMaterial && (
            <ProductInput
              label="Preço de venda"
              onChange={setPrice}
              placeholder="Ex.: 49,90"
              price
              value={price}
            />
          )}
          {isRawMaterial && (
            <p className="text-sm text-muted-foreground">
              Insumos não têm preço de venda: eles são consumidos na produção
              de outros produtos.
            </p>
          )}
          <label className="grid gap-2 text-sm font-medium">
            Observação
            <Textarea
              className="min-h-20 rounded-xl border-[#dce3de] bg-background shadow-none dark:border-border"
              onChange={(event) => setObs(event.target.value)}
              placeholder="Opcional"
              value={obs}
            />
          </label>
          {error && <p className="text-sm font-medium text-red-400">{error}</p>}
          <DialogFooter>
            <Button
              className="rounded-xl bg-[#173f31] text-white hover:bg-[#245742]"
              disabled={create.isPending}
              type="submit"
            >
              {create.isPending && (
                <LoaderCircle className="size-4 animate-spin" />
              )}
              Criar produto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
function ProductInput({
  label,
  onChange,
  price = false,
  placeholder,
  type = "text",
  value,
}: {
  label: string
  onChange: (value: string) => void
  price?: boolean
  placeholder: string
  type?: string
  value: string
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <Input
        className="h-10 rounded-xl border-[#dce3de] bg-background shadow-none dark:border-border"
        inputMode={price ? "decimal" : undefined}
        onChange={(event) => {
          if (!price) return onChange(event.target.value)
          const normalized = event.target.value
            .replace(/[^0-9,]/g, "")
            .replace(/(,.*),/g, "$1")
          onChange(normalized)
        }}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  )
}
function EditProductDialog({
  onClose,
  product,
}: {
  onClose: () => void
  product: Product | null
}) {
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [type, setType] = useState<ProductType>("BOTH")
  const [obs, setObs] = useState("")
  const [error, setError] = useState<string | null>(null)
  const update = useUpdateProduct()
  const isRawMaterial = type === "RAW_MATERIAL"
  useEffect(() => {
    if (product) {
      setName(product.name)
      setPrice(
        product.priceSell === null
          ? ""
          : String(product.priceSell).replace(".", ",")
      )
      setType(product.type)
      setObs(product.obs ?? "")
      setError(null)
    }
  }, [product])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const priceSell = Number(price.replace(",", "."))
    if (!product || !name.trim())
      return setError("Informe o nome do produto.")
    if (!isRawMaterial && (!price || !Number.isFinite(priceSell) || priceSell <= 0))
      return setError("Informe um preço de venda válido.")
    setError(null)
    try {
      await update.mutateAsync({
        id: product.id,
        input: {
          name: name.trim(),
          priceSell: isRawMaterial ? undefined : priceSell,
          type,
          obs: obs.trim() || undefined,
        },
      })
      onClose()
    } catch (reason) {
      setError(getApiErrorMessage(reason))
    }
  }
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={Boolean(product)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar produto</DialogTitle>
          <DialogDescription>
            Atualize os dados comerciais do produto.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <ProductInput
            label="Nome"
            onChange={setName}
            placeholder="Nome do produto"
            value={name}
          />
          <ProductTypeSelect onChange={setType} value={type} />
          {!isRawMaterial && (
            <ProductInput
              label="Preço de venda"
              onChange={setPrice}
              placeholder="Ex.: 49,90"
              price
              value={price}
            />
          )}
          {isRawMaterial && (
            <p className="text-sm text-muted-foreground">
              Insumos não têm preço de venda: eles são consumidos na produção
              de outros produtos.
            </p>
          )}
          <label className="grid gap-2 text-sm font-medium">
            Observação
            <Textarea
              className="min-h-20 rounded-xl border-[#dce3de] bg-background shadow-none dark:border-border"
              onChange={(event) => setObs(event.target.value)}
              value={obs}
            />
          </label>
          {error && <p className="text-sm font-medium text-red-400">{error}</p>}
          <DialogFooter>
            <Button
              className="rounded-xl bg-[#173f31] text-white hover:bg-[#245742]"
              disabled={update.isPending}
              type="submit"
            >
              {update.isPending && (
                <LoaderCircle className="size-4 animate-spin" />
              )}
              Salvar alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
function ArchiveProductDialog({
  onClose,
  onConfirm,
  pending,
  product,
}: {
  onClose: () => void
  onConfirm: () => void
  pending: boolean
  product: Product | null
}) {
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={Boolean(product)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Arquivar produto?</DialogTitle>
          <DialogDescription>
            {product
              ? `${product.name} ficará indisponível para novos registros.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Cancelar
          </Button>
          <Button disabled={pending} onClick={onConfirm} variant="destructive">
            {pending && <LoaderCircle className="size-4 animate-spin" />}
            Arquivar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value))
}

function formatQuantity(value: string | number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 3,
  }).format(Number(value))
}
