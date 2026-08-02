import { useEffect, useState, type FormEvent } from "react"
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  LoaderCircle,
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
import { TableSkeletonRows } from "@/components/shared/table-skeleton"
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
import {
  useAllExpenseTemplates,
  useArchiveExpenseTemplate,
  useCreateExpenseTemplate,
  useDeleteExpenseTemplate,
  useRestoreExpenseTemplate,
  useUpdateExpenseTemplate,
} from "@/hooks/expenses/use-expense-templates"
import { DEFAULT_PAGE_SIZE } from "@/lib/constants"
import { getApiErrorMessage } from "@/lib/http"
import type {
  ExpenseRecurrence,
  ExpenseTemplate,
  ExpenseTemplateInput,
  ExpenseTemplateStatus,
} from "@/services/expense-templates.service"

const pageSize = DEFAULT_PAGE_SIZE

const recurrenceLabels: Record<ExpenseRecurrence, string> = {
  ONE_TIME: "Avulsa",
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  YEARLY: "Anual",
}

const statusLabels: Record<ExpenseTemplateStatus, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  ARCHIVED: "Arquivado",
}

export function ExpenseTemplatesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<ExpenseTemplateStatus | "">("")
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ExpenseTemplate | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<ExpenseTemplate | null>(
    null
  )
  const [deleteTarget, setDeleteTarget] = useState<ExpenseTemplate | null>(null)
  const templates = useAllExpenseTemplates({
    page,
    limit: pageSize,
    search: search || undefined,
    status: status || undefined,
    includeArchived: !status,
  })
  const archive = useArchiveExpenseTemplate()
  const restore = useRestoreExpenseTemplate()
  const remove = useDeleteExpenseTemplate()
  const { data: user } = useCurrentUser()
  const canEdit = user?.role === "ADMIN" || user?.role === "MANAGER"
  const canArchive = user?.role === "ADMIN"

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleDollarSign className="size-4" /> Administração
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
            Modelos de despesas
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Preencha nome e valor de despesas recorrentes mais rapidamente.
          </p>
        </div>
        {canEdit && (
          <Button
            className="h-10 rounded-xl bg-[#173f31] text-white hover:bg-[#245742]"
            onClick={() => setOpen(true)}
          >
            <Plus className="size-4" /> Novo modelo
          </Button>
        )}
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#e5e9e4] bg-background dark:border-border">
        <div className="flex flex-col gap-3 border-b border-[#e5e9e4] p-4 sm:flex-row sm:items-center dark:border-border">
          <div className="relative w-full sm:w-[28rem]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 rounded-xl pl-9 shadow-none"
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Buscar modelo"
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
              <TableHead className="pl-5">Modelo</TableHead>
              <TableHead className="hidden sm:table-cell">
                Recorrência
              </TableHead>
              <TableHead className="text-right">Valor padrão</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.isLoading && (
              <TableSkeletonRows
                columns={[
                  { className: "py-3 pl-5", variant: "avatar", width: "w-40" },
                  { className: "hidden sm:table-cell", width: "w-20" },
                  { align: "right", width: "w-20" },
                  {
                    className: "hidden md:table-cell",
                    variant: "badge",
                    width: "w-16",
                  },
                  { variant: "actions" },
                ]}
              />
            )}
            {!templates.isLoading &&
              templates.data?.data.map((template) => (
                <TemplateRow
                  canArchive={canArchive}
                  canEdit={canEdit}
                  key={template.id}
                  onArchive={() => setArchiveTarget(template)}
                  onDelete={() => setDeleteTarget(template)}
                  onEdit={() => setEditTarget(template)}
                  onRestore={() => restore.mutate(template.id)}
                  restoring={restore.isPending}
                  template={template}
                />
              ))}
            {!templates.isLoading && templates.data?.data.length === 0 && (
              <TableRow>
                <TableCell
                  className="h-52 text-center text-muted-foreground"
                  colSpan={5}
                >
                  Nenhum modelo de despesa encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-[#e5e9e4] p-4 text-sm dark:border-border">
          <span className="text-muted-foreground">
            {templates.data?.total ?? 0} modelo
            {templates.data?.total === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              aria-label="Página anterior"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              size="icon-sm"
              variant="outline"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Página {page} de {templates.data?.totalPage ?? 1}
            </span>
            <Button
              aria-label="Próxima página"
              disabled={!templates.data || page >= templates.data.totalPage}
              onClick={() => setPage((current) => current + 1)}
              size="icon-sm"
              variant="outline"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      <TemplateDialog onClose={() => setOpen(false)} open={open} />
      <TemplateDialog
        onClose={() => setEditTarget(null)}
        template={editTarget}
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
        template={archiveTarget}
      />
      <PermanentDeleteDialog
        name={deleteTarget?.name}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteTarget ? remove.mutateAsync(deleteTarget.id) : Promise.resolve()
        }
        open={Boolean(deleteTarget)}
        resource="modelo de despesa"
      />
    </div>
  )
}

function StatusSelect({
  onChange,
  value,
}: {
  onChange: (value: ExpenseTemplateStatus | "") => void
  value: ExpenseTemplateStatus | ""
}) {
  return (
    <Select
      onValueChange={(next) =>
        onChange(next === "ALL" ? "" : (next as ExpenseTemplateStatus))
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

function TemplateRow({
  canArchive,
  canEdit,
  onArchive,
  onDelete,
  onEdit,
  onRestore,
  restoring,
  template,
}: {
  canArchive: boolean
  canEdit: boolean
  onArchive: () => void
  onDelete: () => void
  onEdit: () => void
  onRestore: () => void
  restoring: boolean
  template: ExpenseTemplate
}) {
  return (
    <TableRow>
      <TableCell className="py-3 pl-5">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground dark:bg-zinc-800 dark:text-zinc-300">
            <CircleDollarSign className="size-4" />
          </span>
          <div>
            <p className="font-medium">{template.name}</p>
            <p className="text-xs text-muted-foreground sm:hidden">
              {recurrenceLabels[template.recurrence]}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden text-muted-foreground sm:table-cell">
        {recurrenceLabels[template.recurrence]}
      </TableCell>
      <TableCell className="text-right">
        {formatCurrency(template.defaultValue)}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <StatusBadge status={template.status} />
      </TableCell>
      <TableCell>
        {canEdit && (
          <Button
            aria-label={`Editar ${template.name}`}
            className="text-muted-foreground hover:text-foreground"
            onClick={onEdit}
            size="icon-sm"
            variant="ghost"
          >
            <Pencil className="size-4" />
          </Button>
        )}
        {canArchive && template.status === "ARCHIVED" && (
          <Button
            aria-label={`Restaurar ${template.name}`}
            className="text-muted-foreground hover:text-foreground"
            disabled={restoring}
            onClick={onRestore}
            size="icon-sm"
            variant="ghost"
          >
            <ArchiveRestore className="size-4" />
          </Button>
        )}
        {canArchive && template.status !== "ARCHIVED" && (
          <Button
            aria-label={`Arquivar ${template.name}`}
            className="text-muted-foreground hover:text-destructive"
            onClick={onArchive}
            size="icon-sm"
            variant="ghost"
          >
            <Archive className="size-4" />
          </Button>
        )}
        {canArchive && (
          <Button
            aria-label={`Excluir ${template.name}`}
            className="text-muted-foreground hover:text-destructive"
            onClick={onDelete}
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

function StatusBadge({ status }: { status: ExpenseTemplateStatus }) {
  const styles: Record<ExpenseTemplateStatus, string> = {
    ACTIVE:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    INACTIVE:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    ARCHIVED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  }
  return <Badge className={styles[status]}>{statusLabels[status]}</Badge>
}

function TemplateDialog({
  onClose,
  open,
  template,
}: {
  onClose: () => void
  open?: boolean
  template?: ExpenseTemplate | null
}) {
  const [input, setInput] = useState<ExpenseTemplateInput>({
    name: "",
    recurrence: "MONTHLY",
    defaultValue: 0,
    obs: "",
  })
  const [value, setValue] = useState("")
  const [anchorDate, setAnchorDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [error, setError] = useState<string | null>(null)
  const create = useCreateExpenseTemplate()
  const update = useUpdateExpenseTemplate()
  const editing = Boolean(template)
  const visible = open ?? Boolean(template)
  const recurring = input.recurrence !== "ONE_TIME"

  useEffect(() => {
    if (template) {
      setInput({
        name: template.name,
        recurrence: template.recurrence,
        defaultValue: Number(template.defaultValue),
        obs: template.obs ?? "",
      })
      setValue(String(template.defaultValue).replace(".", ","))
      setAnchorDate(
        (template.anchorDate ?? template.createdAt).slice(0, 10)
      )
    } else if (open) {
      setInput({ name: "", recurrence: "MONTHLY", defaultValue: 0, obs: "" })
      setValue("")
      setAnchorDate(new Date().toISOString().slice(0, 10))
    }
    setError(null)
  }, [open, template])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const defaultValue = Number(value.replace(",", "."))
    if (!input.name.trim()) return setError("Informe o nome do modelo.")
    if (!Number.isFinite(defaultValue) || defaultValue <= 0)
      return setError("Informe um valor padrão válido.")
    if (recurring && !anchorDate)
      return setError("Informe a data de referência da recorrência.")

    const payload: ExpenseTemplateInput = {
      ...input,
      name: input.name.trim(),
      defaultValue,
      anchorDate: recurring
        ? new Date(`${anchorDate}T12:00:00`).toISOString()
        : undefined,
      obs: input.obs?.trim() || undefined,
    }
    try {
      setError(null)
      if (template)
        await update.mutateAsync({ id: template.id, input: payload })
      else await create.mutateAsync(payload)
      onClose()
    } catch (cause) {
      setError(getApiErrorMessage(cause))
    }
  }

  const pending = create.isPending || update.isPending
  return (
    <Dialog onOpenChange={(next) => !next && onClose()} open={visible}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar modelo" : "Novo modelo de despesa"}
          </DialogTitle>
          <DialogDescription>
            {recurring
              ? "Uma despesa pendente será gerada automaticamente a partir da data de referência."
              : "Recorrência avulsa: nenhuma despesa é gerada automaticamente."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-medium">
            Nome
            <Input
              className="h-10 rounded-xl"
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Ex.: Aluguel"
              value={input.name}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium">
              Recorrência
              <Select
                onValueChange={(next) =>
                  setInput((current) => ({
                    ...current,
                    recurrence: next as ExpenseRecurrence,
                  }))
                }
                value={input.recurrence}
              >
                <SelectTrigger className="h-10! w-full! rounded-xl!">
                  <span>{recurrenceLabels[input.recurrence]}</span>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(recurrenceLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Valor padrão
              <Input
                className="h-10 rounded-xl"
                inputMode="decimal"
                onChange={(event) =>
                  setValue(
                    event.target.value
                      .replace(/[^0-9,]/g, "")
                      .replace(/(,.*),/g, "$1")
                  )
                }
                placeholder="0,00"
                value={value}
              />
            </label>
          </div>
          {recurring && (
            <label className="grid gap-2 text-sm font-medium">
              Data de referência
              <Popover modal>
                <PopoverTrigger
                  render={
                    <Button
                      className="h-10 w-full justify-start rounded-xl border-input bg-input/50 px-3 text-left font-normal shadow-none hover:bg-input/70 dark:bg-input/50 dark:hover:bg-input/70"
                      type="button"
                      variant="outline"
                    />
                  }
                >
                  <CalendarDays className="mr-2 size-4 text-muted-foreground" />
                  {format(
                    new Date(`${anchorDate}T12:00:00`),
                    "dd 'de' MMMM",
                    { locale: ptBR }
                  )}
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    locale={ptBR}
                    mode="single"
                    onSelect={(next) =>
                      next && setAnchorDate(format(next, "yyyy-MM-dd"))
                    }
                    selected={new Date(`${anchorDate}T12:00:00`)}
                  />
                </PopoverContent>
              </Popover>
            </label>
          )}
          <label className="grid gap-2 text-sm font-medium">
            Observação
            <Textarea
              className="min-h-20 rounded-xl"
              onChange={(event) =>
                setInput((current) => ({
                  ...current,
                  obs: event.target.value,
                }))
              }
              placeholder="Opcional"
              value={input.obs ?? ""}
            />
          </label>
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
              className="bg-[#173f31] text-white hover:bg-[#245742]"
              disabled={pending}
              type="submit"
            >
              {pending && <LoaderCircle className="size-4 animate-spin" />}
              {editing ? "Salvar alterações" : "Criar modelo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ArchiveDialog({
  onClose,
  onConfirm,
  pending,
  template,
}: {
  onClose: () => void
  onConfirm: () => void
  pending: boolean
  template: ExpenseTemplate | null
}) {
  return (
    <Dialog
      onOpenChange={(open) => !open && onClose()}
      open={Boolean(template)}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Arquivar modelo?</DialogTitle>
          <DialogDescription>
            {template?.name} deixará de estar disponível para novas despesas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} type="button" variant="outline">
            Cancelar
          </Button>
          <Button disabled={pending} onClick={onConfirm} type="button">
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
  }).format(Number(value) || 0)
}
