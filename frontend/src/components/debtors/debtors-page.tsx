import { useEffect, useRef, useState, type FormEvent } from "react"
import {
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  History,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DebtorStatementDialog } from "@/components/debtors/debtor-statement-dialog"
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
import { useCurrentUser } from "@/hooks/auth/use-current-user"
import {
  useArchiveDebtor,
  useCreateDebtor,
  useDeleteDebtor,
  useDebtors,
  useRestoreDebtor,
  useUpdateDebtor,
} from "@/hooks/debtors/use-debtors"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { DEFAULT_PAGE_SIZE } from "@/lib/constants"
import { getApiErrorMessage } from "@/lib/http"
import type {
  Debtor,
  DebtorInput,
  DebtorStatus,
  PaginatedDebtors,
} from "@/services/debtors.service"

const pageSize = DEFAULT_PAGE_SIZE
const statusLabels = {
  ACTIVE: "Ativos",
  INACTIVE: "Inativos",
  ARCHIVED: "Arquivados",
}

export function DebtorsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<DebtorStatus | "">("")
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Debtor | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Debtor | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Debtor | null>(null)
  const [historyTarget, setHistoryTarget] = useState<string | null>(null)
  const debouncedSearch = useDebouncedValue(search)
  const debtors = useDebtors({
    page,
    limit: pageSize,
    search: debouncedSearch || undefined,
    status: status || undefined,
    includeArchived: !status,
  })
  const archive = useArchiveDebtor()
  const restore = useRestoreDebtor()
  const remove = useDeleteDebtor()
  const { data: user } = useCurrentUser()
  const canEdit = user?.role === "ADMIN" || user?.role === "MANAGER"
  const canArchive = user?.role === "ADMIN"
  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleDollarSign className="size-4" /> Cadastros
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
            Devedores
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Cadastre clientes com valores a receber.
          </p>
        </div>
        {canEdit && (
          <Button
            className="h-10 rounded-xl bg-[#173f31] text-white hover:bg-[#245742]"
            onClick={() => setOpen(true)}
          >
            <Plus className="size-4" /> Novo devedor
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
              <TableHead className="pl-5">Devedor</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Criado em</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {debtors.isLoading && (
              <TableSkeletonRows
                columns={[
                  { className: "py-3 pl-5", variant: "avatar", width: "w-40" },
                  { width: "w-28" },
                  { variant: "badge", width: "w-16" },
                  { className: "hidden md:table-cell", width: "w-24" },
                  { variant: "actions" },
                ]}
              />
            )}
            {!debtors.isLoading &&
              debtors.data?.data.map((debtor) => (
                <DebtorRow
                  canArchive={canArchive}
                  canEdit={canEdit}
                  debtor={debtor}
                  key={debtor.id}
                  onArchive={setArchiveTarget}
                  onDelete={setDeleteTarget}
                  onEdit={setEditTarget}
                  onRestore={(item) => restore.mutate(item.id)}
                  onViewHistory={(item) => setHistoryTarget(item.id)}
                  restoring={restore.isPending}
                />
              ))}
            {!debtors.isLoading && debtors.data?.data.length === 0 && (
              <TableRow>
                <TableCell
                  className="h-52 text-center text-muted-foreground"
                  colSpan={5}
                >
                  Nenhum devedor encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Pagination data={debtors.data} page={page} setPage={setPage} />
      </section>
      <DebtorDialog onClose={() => setOpen(false)} open={open} />
      <DebtorDialog debtor={editTarget} onClose={() => setEditTarget(null)} />
      <ArchiveDialog
        debtor={archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() =>
          archiveTarget &&
          archive.mutate(archiveTarget.id, {
            onSuccess: () => setArchiveTarget(null),
          })
        }
        pending={archive.isPending}
      />
      <PermanentDeleteDialog
        name={deleteTarget?.name}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteTarget ? remove.mutateAsync(deleteTarget.id) : Promise.resolve()
        }
        open={Boolean(deleteTarget)}
        resource="devedor"
      />
      <DebtorStatementDialog
        debtorId={historyTarget}
        onClose={() => setHistoryTarget(null)}
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
  onStatus: (value: DebtorStatus | "") => void
  search: string
  status: DebtorStatus | ""
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#e5e9e4] p-4 sm:flex-row sm:items-center dark:border-border">
      <div className="relative w-full sm:w-[28rem]">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-10 rounded-xl pl-9 shadow-none"
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar devedor"
          value={search}
        />
      </div>
      <Select
        onValueChange={(value) =>
          onStatus(value === "ALL" ? "" : (value as DebtorStatus))
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
function DebtorRow({
  canArchive,
  canEdit,
  debtor,
  onArchive,
  onDelete,
  onEdit,
  onRestore,
  onViewHistory,
  restoring,
}: {
  canArchive: boolean
  canEdit: boolean
  debtor: Debtor
  onArchive: (debtor: Debtor) => void
  onDelete: (debtor: Debtor) => void
  onEdit: (debtor: Debtor) => void
  onRestore: (debtor: Debtor) => void
  onViewHistory: (debtor: Debtor) => void
  restoring: boolean
}) {
  return (
    <TableRow>
      <TableCell className="py-3 pl-5">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground dark:bg-zinc-800 dark:text-zinc-300">
            <CircleDollarSign className="size-4" />
          </span>
          <div>
            <p className="font-medium">{debtor.name}</p>
            {debtor.obs && (
              <p className="max-w-64 truncate text-xs text-muted-foreground">
                {debtor.obs}
              </p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {debtor.phone || "-"}
      </TableCell>
      <TableCell>
        <StatusBadge status={debtor.status} />
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
          new Date(debtor.createdAt)
        )}
      </TableCell>
      <TableCell>
        <Button
          aria-label={`Ver histórico de ${debtor.name}`}
          className="text-muted-foreground hover:text-foreground"
          onClick={() => onViewHistory(debtor)}
          size="icon-sm"
          variant="ghost"
        >
          <History className="size-4" />
        </Button>
        {canEdit && (
          <Button
            aria-label={`Editar ${debtor.name}`}
            className="text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(debtor)}
            size="icon-sm"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
        )}
        {canArchive && debtor.status === "ARCHIVED" && (
          <Button
            aria-label={`Restaurar ${debtor.name}`}
            className="text-muted-foreground hover:text-foreground"
            disabled={restoring}
            onClick={() => onRestore(debtor)}
            size="icon-sm"
            variant="ghost"
          >
            <ArchiveRestore className="size-4" />
          </Button>
        )}
        {canArchive && debtor.status !== "ARCHIVED" && (
          <Button
            aria-label={`Arquivar ${debtor.name}`}
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onArchive(debtor)}
            size="icon-sm"
            variant="ghost"
          >
            <Archive className="size-4" />
          </Button>
        )}
        {canArchive && (
          <Button
            aria-label={`Excluir ${debtor.name}`}
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(debtor)}
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
function StatusBadge({ status }: { status: DebtorStatus }) {
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
function DebtorDialog({
  debtor,
  onClose,
  open,
}: {
  debtor?: Debtor | null
  onClose: () => void
  open?: boolean
}) {
  const [input, setInput] = useState<DebtorInput>({
    name: "",
    phone: "",
    obs: "",
  })
  const [error, setError] = useState<string | null>(null)
  const create = useCreateDebtor()
  const update = useUpdateDebtor()
  const editing = Boolean(debtor)
  const visible = open ?? Boolean(debtor)
  useEffect(() => {
    if (debtor)
      setInput({
        name: debtor.name,
        phone: debtor.phone ?? "",
        obs: debtor.obs ?? "",
      })
    else if (open) setInput({ name: "", phone: "", obs: "" })
    setError(null)
  }, [debtor, open])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!input.name.trim()) return setError("Informe o nome do devedor.")
    setError(null)
    const payload = {
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      obs: input.obs?.trim() || null,
    }
    try {
      if (debtor) await update.mutateAsync({ id: debtor.id, input: payload })
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
            {editing ? "Editar devedor" : "Novo devedor"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Atualize os dados de contato."
              : "Cadastre um cliente com valores pendentes."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <Field
            label="Nome"
            onChange={(value) =>
              setInput((current) => ({ ...current, name: value }))
            }
            placeholder="Nome do devedor"
            value={input.name}
          />
          <Field
            label="Telefone"
            onChange={(value) =>
              setInput((current) => ({ ...current, phone: value }))
            }
            placeholder="Opcional"
            value={input.phone ?? ""}
          />
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
              {editing ? "Salvar alterações" : "Criar devedor"}
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
  debtor,
  onClose,
  onConfirm,
  pending,
}: {
  debtor: Debtor | null
  onClose: () => void
  onConfirm: () => void
  pending: boolean
}) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={Boolean(debtor)}>
      <DialogContent className="sm:max-w-md" initialFocus={confirmRef}>
        <DialogHeader>
          <DialogTitle>Arquivar devedor?</DialogTitle>
          <DialogDescription>
            {debtor
              ? `${debtor.name} ficará indisponível para novas vendas a prazo.`
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
function Pagination({
  data,
  page,
  setPage,
}: {
  data: PaginatedDebtors | undefined
  page: number
  setPage: (callback: (value: number) => number) => void
}) {
  return (
    <div className="flex items-center justify-between border-t border-[#e5e9e4] p-4 text-sm dark:border-border">
      <span className="text-muted-foreground">
        {data?.total ?? 0} devedor{data?.total === 1 ? "" : "es"}
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
