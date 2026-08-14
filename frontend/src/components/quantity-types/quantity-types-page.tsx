import { useEffect, useRef, useState, type FormEvent } from "react"
import {
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Plus,
  Ruler,
  Search,
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
import { useCurrentUser } from "@/hooks/auth/use-current-user"
import {
  useArchiveQuantityType,
  useCreateQuantityType,
  useDeleteQuantityType,
  useQuantityTypes,
  useRestoreQuantityType,
  useUpdateQuantityType,
} from "@/hooks/quantity-types/use-quantity-types"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { DEFAULT_PAGE_SIZE } from "@/lib/constants"
import { getApiErrorMessage } from "@/lib/http"
import type {
  QuantityType,
  QuantityTypeStatus,
} from "@/services/quantity-types.service"

const pageSize = DEFAULT_PAGE_SIZE
const statusLabels = {
  ACTIVE: "Ativos",
  INACTIVE: "Inativos",
  ARCHIVED: "Arquivados",
}

export function QuantityTypesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<QuantityTypeStatus | "">("")
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<QuantityType | null>(null)
  const [editTarget, setEditTarget] = useState<QuantityType | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<QuantityType | null>(null)
  const debouncedSearch = useDebouncedValue(search)
  const types = useQuantityTypes({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    status: status || undefined,
    includeArchived: !status,
  })
  const archive = useArchiveQuantityType()
  const restore = useRestoreQuantityType()
  const remove = useDeleteQuantityType()
  const { data: user } = useCurrentUser()
  const canCreate = user?.role === "ADMIN" || user?.role === "MANAGER"
  const canArchive = user?.role === "ADMIN"
  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Ruler className="size-4" /> Cadastros
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
            Tipos de quantidade
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Defina como o estoque será medido.
          </p>
        </div>
        {canCreate && (
          <Button
            className="h-10 rounded-xl bg-[#173f31] text-white hover:bg-[#245742]"
            onClick={() => setOpen(true)}
          >
            <Plus className="size-4" /> Novo tipo
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
              placeholder="Buscar tipo de quantidade"
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
              <TableHead className="pl-5">Tipo de quantidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Criado em</TableHead>
              <TableHead className="w-14" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.isLoading && (
              <TableSkeletonRows
                columns={[
                  { className: "py-3 pl-5", variant: "avatar", width: "w-40" },
                  { variant: "badge", width: "w-16" },
                  { className: "hidden md:table-cell", width: "w-24" },
                  { variant: "actions" },
                ]}
              />
            )}
            {!types.isLoading &&
              types.data?.data.map((type) => (
                <TypeRow
                  canArchive={canArchive}
                  canEdit={canCreate}
                  key={type.id}
                  onArchive={setTarget}
                  onDelete={setDeleteTarget}
                  onEdit={setEditTarget}
                  onRestore={(item) => restore.mutate(item.id)}
                  restoring={restore.isPending}
                  type={type}
                />
              ))}
            {!types.isLoading && types.data?.data.length === 0 && (
              <TableRow>
                <TableCell
                  className="h-52 text-center text-muted-foreground"
                  colSpan={4}
                >
                  Nenhum tipo de quantidade encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-[#e5e9e4] p-4 text-sm dark:border-border">
          <span className="text-muted-foreground">
            {types.data?.total ?? 0} tipo{types.data?.total === 1 ? "" : "s"}
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
              Página {page} de {types.data?.totalPage ?? 1}
            </span>
            <Button
              aria-label="Próxima página"
              disabled={!types.data || page >= types.data.totalPage}
              onClick={() => setPage((value) => value + 1)}
              size="icon-sm"
              variant="outline"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>
      <CreateTypeDialog onOpenChange={setOpen} open={open} />
      <EditTypeDialog onClose={() => setEditTarget(null)} type={editTarget} />
      <ArchiveTypeDialog
        onClose={() => setTarget(null)}
        onConfirm={() =>
          target &&
          archive.mutate(target.id, { onSuccess: () => setTarget(null) })
        }
        pending={archive.isPending}
        type={target}
      />
      <PermanentDeleteDialog
        name={deleteTarget?.name}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteTarget ? remove.mutateAsync(deleteTarget.id) : Promise.resolve()
        }
        open={Boolean(deleteTarget)}
        resource="tipo de quantidade"
      />
    </div>
  )
}

function StatusSelect({
  onChange,
  value,
}: {
  onChange: (value: QuantityTypeStatus | "") => void
  value: QuantityTypeStatus | ""
}) {
  return (
    <Select
      onValueChange={(next) =>
        onChange(next === "ALL" ? "" : (next as QuantityTypeStatus))
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
function TypeRow({
  canArchive,
  canEdit,
  onArchive,
  onDelete,
  onEdit,
  onRestore,
  restoring,
  type,
}: {
  canArchive: boolean
  canEdit: boolean
  onArchive: (type: QuantityType) => void
  onDelete: (type: QuantityType) => void
  onEdit: (type: QuantityType) => void
  onRestore: (type: QuantityType) => void
  restoring: boolean
  type: QuantityType
}) {
  return (
    <TableRow>
      <TableCell className="py-3 pl-5">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground dark:bg-zinc-800 dark:text-zinc-300">
            <Ruler className="size-4" />
          </span>
          <p className="font-medium">{type.name}</p>
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge status={type.status} />
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
          new Date(type.createdAt)
        )}
      </TableCell>
      <TableCell>
        {canEdit && (
          <Button
            aria-label={`Editar ${type.name}`}
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(type)}
            size="icon-sm"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
        )}
        {canArchive && type.status === "ARCHIVED" && (
          <Button
            aria-label={`Restaurar ${type.name}`}
            className="text-muted-foreground hover:text-foreground"
            disabled={restoring}
            onClick={() => onRestore(type)}
            size="icon-sm"
            variant="ghost"
          >
            <ArchiveRestore className="size-4" />
          </Button>
        )}
        {canArchive && type.status !== "ARCHIVED" && (
          <Button
            aria-label={`Arquivar ${type.name}`}
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onArchive(type)}
            size="icon-sm"
            variant="ghost"
          >
            <Archive className="size-4" />
          </Button>
        )}
        {canArchive && (
          <Button
            aria-label={`Excluir ${type.name}`}
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(type)}
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
function StatusBadge({ status }: { status: QuantityTypeStatus }) {
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
function CreateTypeDialog({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const create = useCreateQuantityType()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) return setError("Informe o nome do tipo de quantidade.")
    setError(null)
    try {
      await create.mutateAsync(name.trim())
      setName("")
      onOpenChange(false)
    } catch (reason) {
      setError(getApiErrorMessage(reason))
    }
  }
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo tipo de quantidade</DialogTitle>
          <DialogDescription>
            Exemplos: unidade, caixa, quilograma ou litro.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-medium">
            Nome
            <Input
              className="h-10 rounded-xl border-[#dce3de] bg-background shadow-none dark:border-border"
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: Unidade"
              value={name}
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
              Criar tipo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
function EditTypeDialog({
  onClose,
  type,
}: {
  onClose: () => void
  type: QuantityType | null
}) {
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const update = useUpdateQuantityType()
  useEffect(() => {
    if (type) {
      setName(type.name)
      setError(null)
    }
  }, [type])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!type || !name.trim())
      return setError("Informe o nome do tipo de quantidade.")
    setError(null)
    try {
      await update.mutateAsync({ id: type.id, name: name.trim() })
      onClose()
    } catch (reason) {
      setError(getApiErrorMessage(reason))
    }
  }
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={Boolean(type)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar tipo de quantidade</DialogTitle>
          <DialogDescription>
            Atualize o nome usado nas entradas de estoque.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-medium">
            Nome
            <Input
              className="h-10 rounded-xl border-[#dce3de] bg-background shadow-none dark:border-border"
              onChange={(event) => setName(event.target.value)}
              value={name}
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
function ArchiveTypeDialog({
  onClose,
  onConfirm,
  pending,
  type,
}: {
  onClose: () => void
  onConfirm: () => void
  pending: boolean
  type: QuantityType | null
}) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={Boolean(type)}>
      <DialogContent className="sm:max-w-md" initialFocus={confirmRef}>
        <DialogHeader>
          <DialogTitle>Arquivar tipo de quantidade?</DialogTitle>
          <DialogDescription>
            {type
              ? `${type.name} ficará indisponível para novos registros.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Cancelar
          </Button>
          <Button
            ref={confirmRef}
            disabled={pending}
            onClick={onConfirm}
            variant="destructive"
          >
            {pending && <LoaderCircle className="size-4 animate-spin" />}
            Arquivar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
