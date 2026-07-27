import { useEffect, useState, type FormEvent } from "react"
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Truck,
  Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PermanentDeleteDialog } from "@/components/shared/permanent-delete-dialog"
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
import { useCurrentUser } from "@/hooks/auth/use-current-user"
import {
  useArchiveSupplier,
  useCreateSupplier,
  useDeleteSupplier,
  useSuppliers,
  useUpdateSupplier,
} from "@/hooks/suppliers/use-suppliers"
import { getApiErrorMessage } from "@/lib/http"
import type {
  PaginatedSuppliers,
  Supplier,
  SupplierInput,
  SupplierStatus,
} from "@/services/suppliers.service"

const pageSize = 20
const statusLabels = {
  ACTIVE: "Ativos",
  INACTIVE: "Inativos",
  ARCHIVED: "Arquivados",
}

export function SuppliersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<SupplierStatus | "">("")
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Supplier | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Supplier | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null)
  const suppliers = useSuppliers({
    page,
    limit: pageSize,
    search: search || undefined,
    status: status || undefined,
    includeArchived: !status,
  })
  const archive = useArchiveSupplier()
  const remove = useDeleteSupplier()
  const { data: user } = useCurrentUser()
  const canEdit = user?.role === "ADMIN" || user?.role === "MANAGER"
  const canArchive = user?.role === "ADMIN"
  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Truck className="size-4" /> Cadastros
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
            Fornecedores
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Organize os parceiros de compra da operação.
          </p>
        </div>
        {canEdit && (
          <Button
            className="h-10 rounded-xl bg-[#173f31] text-white hover:bg-[#245742]"
            onClick={() => setOpen(true)}
          >
            <Plus className="size-4" /> Novo fornecedor
          </Button>
        )}
      </div>
      <section className="rounded-2xl border border-[#e5e9e4] bg-background dark:border-border">
        <Filters
          onSearch={(value) => {
            setSearch(value)
            setPage(1)
          }}
          onStatus={(value) => {
            setStatus(value)
            setPage(1)
          }}
          search={search}
          status={status}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Fornecedor</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Criado em</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.isLoading && <LoadingRows />}
            {!suppliers.isLoading &&
              suppliers.data?.data.map((supplier) => (
                <SupplierRow
                  canArchive={canArchive}
                  canEdit={canEdit}
                  key={supplier.id}
                  onArchive={setArchiveTarget}
                  onDelete={setDeleteTarget}
                  onEdit={setEditTarget}
                  supplier={supplier}
                />
              ))}
            {!suppliers.isLoading && suppliers.data?.data.length === 0 && (
              <TableRow>
                <TableCell
                  className="h-52 text-center text-muted-foreground"
                  colSpan={5}
                >
                  Nenhum fornecedor encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Pagination data={suppliers.data} page={page} setPage={setPage} />
      </section>
      <SupplierDialog onClose={() => setOpen(false)} open={open} />
      <SupplierDialog
        onClose={() => setEditTarget(null)}
        supplier={editTarget}
      />
      <ArchiveDialog
        onClose={() => setArchiveTarget(null)}
        onConfirm={() =>
          archiveTarget &&
          archive.mutate(archiveTarget.id, {
            onSuccess: () => setArchiveTarget(null),
          })
        }
        pending={archive.isPending}
        supplier={archiveTarget}
      />
      <PermanentDeleteDialog
        name={deleteTarget?.name}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteTarget ? remove.mutateAsync(deleteTarget.id) : Promise.resolve()
        }
        open={Boolean(deleteTarget)}
        resource="fornecedor"
      />
    </div>
  )
}

function Filters({
  onSearch,
  onStatus,
  search,
  status,
}: {
  onSearch: (value: string) => void
  onStatus: (value: SupplierStatus | "") => void
  search: string
  status: SupplierStatus | ""
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#e5e9e4] p-4 sm:flex-row sm:items-center dark:border-border">
      <div className="relative w-full sm:w-[28rem]">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 rounded-xl bg-muted/40 pl-9 shadow-none"
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar fornecedor"
          value={search}
        />
      </div>
      <Select
        onValueChange={(value) =>
          onStatus(value === "ALL" ? "" : (value as SupplierStatus))
        }
        value={status || "ALL"}
      >
        <SelectTrigger className="h-10! w-full rounded-xl! border-[#dce3de]! bg-input/50! px-2.5! py-1! text-sm shadow-none data-[size=default]:h-10! sm:w-52 dark:border-border!">
          <span>{status ? statusLabels[status] : "Todos os status"}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos os status</SelectItem>
          <SelectItem value="ACTIVE">Ativos</SelectItem>
          <SelectItem value="INACTIVE">Inativos</SelectItem>
          <SelectItem value="ARCHIVED">Arquivados</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
function SupplierRow({
  canArchive,
  canEdit,
  onArchive,
  onDelete,
  onEdit,
  supplier,
}: {
  canArchive: boolean
  canEdit: boolean
  onArchive: (supplier: Supplier) => void
  onDelete: (supplier: Supplier) => void
  onEdit: (supplier: Supplier) => void
  supplier: Supplier
}) {
  return (
    <TableRow>
      <TableCell className="py-3 pl-5">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground dark:bg-zinc-800 dark:text-zinc-300">
            <Truck className="size-4" />
          </span>
          <div>
            <p className="font-medium">{supplier.name}</p>
            {supplier.obs && (
              <p className="max-w-64 truncate text-xs text-muted-foreground">
                {supplier.obs}
              </p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {supplier.phone || "-"}
      </TableCell>
      <TableCell>
        <StatusBadge status={supplier.status} />
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
          new Date(supplier.createdAt)
        )}
      </TableCell>
      <TableCell>
        {canEdit && (
          <Button
            aria-label={`Editar ${supplier.name}`}
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(supplier)}
            size="icon-sm"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
        )}
        {canArchive && (
          <Button
            aria-label={`Arquivar ${supplier.name}`}
            className="text-muted-foreground hover:text-destructive"
            disabled={supplier.status === "ARCHIVED"}
            onClick={() => onArchive(supplier)}
            size="icon-sm"
            variant="ghost"
          >
            <Archive className="size-4" />
          </Button>
        )}
        {canArchive && (
          <Button
            aria-label={`Excluir ${supplier.name}`}
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(supplier)}
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
function StatusBadge({ status }: { status: SupplierStatus }) {
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
function SupplierDialog({
  onClose,
  open,
  supplier,
}: {
  onClose: () => void
  open?: boolean
  supplier?: Supplier | null
}) {
  const [input, setInput] = useState<SupplierInput>({
    name: "",
    phone: "",
    obs: "",
  })
  const [error, setError] = useState<string | null>(null)
  const create = useCreateSupplier()
  const update = useUpdateSupplier()
  const editing = Boolean(supplier)
  const visible = open ?? Boolean(supplier)
  useEffect(() => {
    if (supplier)
      setInput({
        name: supplier.name,
        phone: supplier.phone ?? "",
        obs: supplier.obs ?? "",
      })
    else if (open) setInput({ name: "", phone: "", obs: "" })
    setError(null)
  }, [supplier, open])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!input.name.trim()) return setError("Informe o nome do fornecedor.")
    setError(null)
    const payload = {
      name: input.name.trim(),
      phone: input.phone?.trim() || undefined,
      obs: input.obs?.trim() || undefined,
    }
    try {
      if (supplier)
        await update.mutateAsync({ id: supplier.id, input: payload })
      else await create.mutateAsync(payload)
      onClose()
    } catch (reason) {
      setError(getApiErrorMessage(reason))
    }
  }
  const pending = create.isPending || update.isPending
  return (
    <Dialog onOpenChange={(value) => !value && onClose()} open={visible}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar fornecedor" : "Novo fornecedor"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Atualize os dados de contato."
              : "Cadastre um parceiro para as entradas de estoque."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <Field
            label="Nome"
            onChange={(value) =>
              setInput((current) => ({ ...current, name: value }))
            }
            placeholder="Nome do fornecedor"
            value={input.name}
          />
          <Field
            label="Telefone"
            onChange={(value) =>
              setInput((current) => ({ ...current, phone: value }))
            }
            placeholder="Opcional"
            value={input.phone ?? ""}
          />{" "}
          <label className="grid gap-2 text-sm font-medium">
            Observação
            <Textarea
              className="min-h-20 rounded-xl border-[#dce3de] bg-background shadow-none dark:border-border"
              onChange={(event) =>
                setInput((current) => ({ ...current, obs: event.target.value }))
              }
              placeholder="Opcional"
              value={input.obs ?? ""}
            />
          </label>
          {error && <p className="text-sm font-medium text-red-400">{error}</p>}
          <DialogFooter>
            <Button
              className="rounded-xl bg-[#173f31] text-white hover:bg-[#245742]"
              disabled={pending}
              type="submit"
            >
              {pending && <LoaderCircle className="size-4 animate-spin" />}
              {editing ? "Salvar alterações" : "Criar fornecedor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
function Field({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string
  onChange: (value: string) => void
  placeholder: string
  value: string
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <Input
        className="h-10 rounded-xl border-[#dce3de] bg-background shadow-none dark:border-border"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  )
}
function ArchiveDialog({
  onClose,
  onConfirm,
  pending,
  supplier,
}: {
  onClose: () => void
  onConfirm: () => void
  pending: boolean
  supplier: Supplier | null
}) {
  return (
    <Dialog
      onOpenChange={(open) => !open && onClose()}
      open={Boolean(supplier)}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Arquivar fornecedor?</DialogTitle>
          <DialogDescription>
            {supplier
              ? `${supplier.name} ficará indisponível para novas entradas.`
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
function Pagination({
  data,
  page,
  setPage,
}: {
  data: PaginatedSuppliers | undefined
  page: number
  setPage: (callback: (value: number) => number) => void
}) {
  return (
    <div className="flex items-center justify-between border-t border-[#e5e9e4] p-4 text-sm dark:border-border">
      <span className="text-muted-foreground">
        {data?.total ?? 0} fornecedor{data?.total === 1 ? "" : "es"}
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
          Página {page} de {data?.totalPage ?? 1}
        </span>
        <Button
          aria-label="Próxima página"
          disabled={!data || page >= data.totalPage}
          onClick={() => setPage((value) => value + 1)}
          size="icon-sm"
          variant="outline"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
function LoadingRows() {
  return (
    <>
      {[0, 1, 2].map((row) => (
        <TableRow key={row}>
          <TableCell className="h-16" colSpan={5}>
            <span className="block h-5 w-full animate-pulse rounded bg-muted" />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}
