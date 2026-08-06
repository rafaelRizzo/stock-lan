import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  WalletCards,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
import { useExpenseTemplates } from "@/hooks/expenses/use-expense-templates"
import {
  useCreateExpense,
  useDeleteExpense,
  useExpenses,
  useUpdateExpense,
} from "@/hooks/expenses/use-expenses"
import { DEFAULT_PAGE_SIZE } from "@/lib/constants"
import { getApiErrorMessage } from "@/lib/http"
import type {
  Expense,
  ExpenseInput,
  ExpenseStatus,
} from "@/services/expenses.service"

const pageSize = DEFAULT_PAGE_SIZE
const statuses: Record<ExpenseStatus, string> = {
  PENDING: "Pendente",
  PAID: "Paga",
  CANCELED: "Cancelada",
}
const selectClass =
  "h-10! w-full rounded-xl! border-[#dce3de]! bg-input/50! px-2.5! py-1! text-sm shadow-none data-[size=default]:h-10! dark:border-border!"

export function ExpensesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<ExpenseStatus | "">("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Expense | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null)
  const expenses = useExpenses({
    page,
    limit: pageSize,
    search: search || undefined,
    status: status || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  })
  const { data: user } = useCurrentUser()
  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER"
  const markPaid = useUpdateExpense()

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <WalletCards className="size-4" /> Financeiro
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
            Despesas
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Controle os custos e vencimentos da operação.
          </p>
        </div>
        {canManage && (
          <Button
            className="h-10 rounded-xl bg-[#173f31] text-white hover:bg-[#245742]"
            onClick={() => setOpen(true)}
          >
            <Plus className="size-4" /> Nova despesa
          </Button>
        )}
      </div>
      <section className="rounded-2xl border border-[#e5e9e4] bg-background dark:border-border">
        <div className="flex flex-col gap-3 border-b border-[#e5e9e4] p-4 sm:flex-row sm:items-center dark:border-border">
          <div className="relative w-full sm:w-[28rem]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 rounded-xl pl-9 text-sm shadow-none"
              placeholder="Buscar despesa"
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
              setStatus(value === "ALL" ? "" : (value as ExpenseStatus))
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
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(from, to) => {
              setDateFrom(from)
              setDateTo(to)
              setPage(1)
            }}
            placeholder="Vencimento"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Despesa</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.isLoading ? (
              <TableSkeletonRows
                columns={[
                  { className: "py-3 pl-5", variant: "avatar", width: "w-40" },
                  { width: "w-24" },
                  { width: "w-20" },
                  { variant: "badge", width: "w-16" },
                  { variant: "actions" },
                ]}
              />
            ) : (
              expenses.data?.data.map((expense) => (
                <ExpenseRow
                  canManage={canManage}
                  expense={expense}
                  key={expense.id}
                  markingPaid={markPaid.isPending}
                  onDelete={setDeleteTarget}
                  onEdit={setEditTarget}
                  onMarkPaid={(item) =>
                    markPaid.mutate({
                      id: item.id,
                      input: { status: "PAID", paidAt: new Date() },
                    })
                  }
                />
              ))
            )}
            {!expenses.isLoading && expenses.data?.data.length === 0 && (
              <TableRow>
                <TableCell
                  className="h-52 text-center text-muted-foreground"
                  colSpan={5}
                >
                  Nenhuma despesa encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Pagination data={expenses.data} page={page} setPage={setPage} />
      </section>
      <ExpenseDialog onClose={() => setOpen(false)} open={open} />
      <ExpenseDialog expense={editTarget} onClose={() => setEditTarget(null)} />
      <DeleteExpenseDialog
        expense={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function ExpenseRow({
  expense,
  canManage,
  markingPaid,
  onEdit,
  onDelete,
  onMarkPaid,
}: {
  expense: Expense
  canManage: boolean
  markingPaid: boolean
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
  onMarkPaid: (expense: Expense) => void
}) {
  const colors: Record<ExpenseStatus, string> = {
    PENDING:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    CANCELED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  }
  return (
    <TableRow>
      <TableCell className="py-3 pl-5">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground dark:bg-zinc-800 dark:text-zinc-300">
            <WalletCards className="size-4" />
          </span>
          <div>
            <p className="font-medium">{expense.name}</p>
            {expense.obs && (
              <p className="max-w-64 truncate text-xs text-muted-foreground">
                {expense.obs}
              </p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {date(expense.dueDate)}
      </TableCell>
      <TableCell className="font-medium">{currency(expense.value)}</TableCell>
      <TableCell>
        <Badge className={colors[expense.status]}>
          {statuses[expense.status]}
        </Badge>
      </TableCell>
      <TableCell>
        {canManage && expense.status === "PENDING" && (
          <Button
            aria-label={`Dar baixa em ${expense.name}`}
            className="text-muted-foreground hover:text-emerald-600"
            disabled={markingPaid}
            onClick={() => onMarkPaid(expense)}
            size="icon-sm"
            variant="ghost"
          >
            <CheckCircle2 className="size-4" />
          </Button>
        )}
        {canManage && (
          <>
            <Button
              aria-label={`Editar ${expense.name}`}
              className="text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(expense)}
              size="icon-sm"
              variant="ghost"
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              aria-label={`Excluir ${expense.name}`}
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(expense)}
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

function ExpenseDialog({
  expense,
  open,
  onClose,
}: {
  expense?: Expense | null
  open?: boolean
  onClose: () => void
}) {
  const [name, setName] = useState("")
  const [expenseTemplateId, setExpenseTemplateId] = useState("")
  const [value, setValue] = useState("")
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10))
  const [status, setStatus] = useState<ExpenseStatus>("PENDING")
  const [obs, setObs] = useState("")
  const [error, setError] = useState<string | null>(null)
  const create = useCreateExpense()
  const update = useUpdateExpense()
  const templates = useExpenseTemplates()
  const selectedTemplate = templates.data?.data.find(
    (template) => template.id === expenseTemplateId
  )
  const editing = Boolean(expense)
  const visible = open ?? editing
  const reset = () => {
    setName("")
    setExpenseTemplateId("")
    setValue("")
    setDueDate(new Date().toISOString().slice(0, 10))
    setStatus("PENDING")
    setObs("")
    setError(null)
  }
  useEffect(() => {
    if (expense) {
      setName(expense.name)
      setExpenseTemplateId(expense.expenseTemplate?.id ?? "")
      setValue(String(expense.value).replace(".", ","))
      setDueDate(expense.dueDate.slice(0, 10))
      setStatus(expense.status)
      setObs(expense.obs ?? "")
    } else if (open) reset()
    setError(null)
  }, [expense, open])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedValue = Number(value.replace(",", "."))
    if (!name.trim() || parsedValue <= 0 || !dueDate)
      return setError("Informe nome, valor e vencimento válidos.")
    const input: ExpenseInput = {
      expenseTemplateId: expenseTemplateId || undefined,
      name: name.trim(),
      value: parsedValue,
      dueDate: new Date(`${dueDate}T12:00:00`),
      status,
      paidAt: status === "PAID" ? new Date() : undefined,
      obs: obs.trim() || undefined,
    }
    try {
      if (expense) await update.mutateAsync({ id: expense.id, input })
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
            {editing ? "Editar despesa" : "Nova despesa"}
          </DialogTitle>
          <DialogDescription>
            Defina valor, vencimento e situação.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Nome">
            <Input
              className="h-10 rounded-xl"
              placeholder="Ex.: Aluguel"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="Modelo de despesa">
            <Select
              value={expenseTemplateId || "NONE"}
              onValueChange={(next) => {
                const id = next === "NONE" ? "" : (next ?? "")
                setExpenseTemplateId(id)
                const template = templates.data?.data.find(
                  (item) => item.id === id
                )
                if (template) {
                  setName(template.name)
                  setValue(String(template.defaultValue).replace(".", ","))
                }
              }}
            >
              <SelectTrigger className={selectClass}>
                <span>{selectedTemplate?.name ?? "Despesa avulsa"}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Despesa avulsa</SelectItem>
                {templates.data?.data.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
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
            <Field label="Situação">
              <Select
                value={status}
                onValueChange={(next) => setStatus(next as ExpenseStatus)}
              >
                <SelectTrigger className={selectClass}>
                  <span>{statuses[status]}</span>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statuses).map(([item, label]) => (
                    <SelectItem key={item} value={item}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <DateField
              date={dueDate}
              label="Vencimento"
              onChange={setDueDate}
            />
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
              )}
              {editing ? "Salvar alterações" : "Registrar despesa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DateField({
  label,
  date,
  onChange,
}: {
  label: string
  date: string
  onChange: (value: string) => void
}) {
  return (
    <Field label={label}>
      <div className="h-10">
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
            {format(new Date(`${date}T12:00:00`), "dd 'de' MMMM", {
              locale: ptBR,
            })}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              locale={ptBR}
              mode="single"
              onSelect={(value) =>
                value && onChange(format(value, "yyyy-MM-dd"))
              }
              selected={new Date(`${date}T12:00:00`)}
            />
          </PopoverContent>
        </Popover>
      </div>
    </Field>
  )
}

function DeleteExpenseDialog({
  expense,
  onClose,
}: {
  expense: Expense | null
  onClose: () => void
}) {
  const remove = useDeleteExpense()
  const [error, setError] = useState<string | null>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  useEffect(() => setError(null), [expense])
  async function confirm() {
    if (!expense) return
    try {
      await remove.mutateAsync(expense.id)
      onClose()
    } catch (cause) {
      setError(getApiErrorMessage(cause))
    }
  }
  return (
    <Dialog
      open={Boolean(expense)}
      onOpenChange={(value) => !value && onClose()}
    >
      <DialogContent className="sm:max-w-md" initialFocus={confirmRef}>
        <DialogHeader>
          <DialogTitle>Excluir despesa?</DialogTitle>
          <DialogDescription>
            {expense?.name} será removida permanentemente.
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
            Excluir despesa
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
      <span>{data?.total ?? 0} despesas</span>
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
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value))
