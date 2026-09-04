import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  ChevronLeft,
  ChevronRight,
  HandCoins,
  History,
  LoaderCircle,
  MessageCircle,
  WalletCards,
} from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { DateRangePicker } from "@/components/shared/date-range-picker"
import {
  balanceOf,
  DebtorStatementDialog,
  formatCurrency,
  paidOf,
  paymentMethods,
  whatsappStatementLink,
} from "@/components/debtors/debtor-statement-dialog"
import { SearchableSelect } from "@/components/shared/searchable-select"
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
import { useDebtors } from "@/hooks/debtors/use-debtors"
import {
  useDebtorStatement,
  useDebtReports,
  useRegisterDebtPayment,
} from "@/hooks/reports/use-dashboard-summary"
import { DEFAULT_PAGE_SIZE } from "@/lib/constants"
import { getApiErrorMessage } from "@/lib/http"
import { cn } from "@/lib/utils"
import type { DebtReport } from "@/services/reports.service"
import type { PaymentMethod } from "@/services/sales.service"

const pageSize = DEFAULT_PAGE_SIZE
const selectClass =
  "h-10! w-full rounded-xl! border-[#dce3de]! bg-input/50! px-2.5! py-1! text-sm shadow-none data-[size=default]:h-10! dark:border-border!"

export function DebtReportsPage() {
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [debtorId, setDebtorId] = useState("")
  const [paymentTarget, setPaymentTarget] = useState<DebtReport | null>(null)
  const [historyDebtorId, setHistoryDebtorId] = useState<string | null>(null)
  const debtors = useDebtors({ page: 1, limit: 100, status: "ACTIVE" })
  const debtorOptions = useMemo(
    () => [
      { value: "ALL", label: "Todos os devedores" },
      ...(debtors.data?.data ?? []).map((debtor) => ({
        value: debtor.id,
        label: debtor.name,
      })),
    ],
    [debtors.data]
  )
  const debts = useDebtReports({
    page,
    limit: pageSize,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    debtorId: debtorId || undefined,
  })
  const totalOutstanding = debts.data?.data.reduce(
    (total, debt) => total + balanceOf(debt),
    0
  )

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <HandCoins className="size-4" /> Financeiro
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
            Contas a receber
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Vendas fiadas e seus pagamentos pendentes.
          </p>
        </div>
        <div className="rounded-2xl bg-[#eaf4ec] px-4 py-3 dark:bg-emerald-950">
          <p className="text-xs font-medium text-[#2e7152] dark:text-emerald-300">
            Total pendente
          </p>
          <p className="mt-1 text-lg font-semibold text-[#2e7152] dark:text-emerald-300">
            {formatCurrency(totalOutstanding ?? 0)}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#e5e9e4] bg-background dark:border-border">
        <div className="flex flex-col gap-3 border-b border-[#e5e9e4] p-4 sm:flex-row sm:items-center dark:border-border">
          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(from, to) => {
              setDateFrom(from)
              setDateTo(to)
              setPage(1)
            }}
          />
          <SearchableSelect
            className={`${selectClass} sm:w-56`}
            items={debtorOptions}
            onValueChange={(value) => {
              setDebtorId(value === "ALL" ? "" : value)
              setPage(1)
            }}
            placeholder="Todos os devedores"
            value={debtorId || "ALL"}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Cliente</TableHead>
              <TableHead className="hidden md:table-cell">Vendas</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="hidden text-right sm:table-cell">
                Recebido
              </TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {debts.isLoading && (
              <TableSkeletonRows
                columns={[
                  { className: "py-3 pl-5", variant: "text", width: "w-40" },
                  { className: "hidden md:table-cell", width: "w-24" },
                  { align: "right", width: "w-20" },
                  {
                    className: "hidden sm:table-cell",
                    align: "right",
                    width: "w-20",
                  },
                  { align: "right", width: "w-20" },
                  { variant: "button", width: "w-24" },
                ]}
              />
            )}
            {!debts.isLoading &&
              debts.data?.data.map((debt) => (
                <DebtRow
                  debt={debt}
                  key={debt.id}
                  onReceive={() => setPaymentTarget(debt)}
                  onViewHistory={() =>
                    debt.debtor && setHistoryDebtorId(debt.debtor.id)
                  }
                />
              ))}
            {!debts.isLoading && debts.data?.data.length === 0 && (
              <TableRow>
                <TableCell
                  className="h-52 text-center text-muted-foreground"
                  colSpan={6}
                >
                  Nenhuma conta a receber.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-[#e5e9e4] p-4 text-sm dark:border-border">
          <span className="text-muted-foreground">
            {debts.data?.total ?? 0} conta{debts.data?.total === 1 ? "" : "s"}
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
              Página {page} de {debts.data?.totalPage ?? 1}
            </span>
            <Button
              aria-label="Próxima página"
              disabled={!debts.data || page >= debts.data.totalPage}
              onClick={() => setPage((current) => current + 1)}
              size="icon-sm"
              variant="outline"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      <ReceivePaymentDialog
        debt={paymentTarget}
        onClose={() => setPaymentTarget(null)}
      />
      <DebtorStatementDialog
        debtorId={historyDebtorId}
        onClose={() => setHistoryDebtorId(null)}
      />
    </div>
  )
}

function DebtRow({
  debt,
  onReceive,
  onViewHistory,
}: {
  debt: DebtReport
  onReceive: () => void
  onViewHistory: () => void
}) {
  const paid = paidOf(debt)
  const balance = balanceOf(debt)

  return (
    <TableRow>
      <TableCell className="py-3 pl-5">
        <div>
          <p className="font-medium">
            {debt.debtor?.name ?? debt.clientName ?? "Cliente não informado"}
          </p>
          <p className="text-xs text-muted-foreground md:hidden">
            {debt.salesCount} venda{debt.salesCount === 1 ? "" : "s"}
          </p>
        </div>
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        {debt.salesCount} venda{debt.salesCount === 1 ? "" : "s"}
      </TableCell>
      <TableCell className="text-right">{formatCurrency(debt.total)}</TableCell>
      <TableCell className="hidden text-right text-[#2e7152] sm:table-cell dark:text-emerald-300">
        {formatCurrency(paid)}
      </TableCell>
      <TableCell className="text-right font-semibold text-[#b84c5d] dark:text-rose-300">
        {formatCurrency(balance)}
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1.5">
          {debt.debtor && (
            <>
              <Button
                aria-label="Ver histórico do devedor"
                onClick={onViewHistory}
                size="icon-sm"
                variant="ghost"
              >
                <History className="size-4" />
              </Button>
              <Button
                className="rounded-xl"
                onClick={onReceive}
                size="sm"
                variant="outline"
              >
                <WalletCards className="size-4" /> Receber
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

function ReceivePaymentDialog({
  debt,
  onClose,
}: {
  debt: DebtReport | null
  onClose: () => void
}) {
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<PaymentMethod>("PIX")
  const [error, setError] = useState<string | null>(null)
  const [sendPromptDebtorId, setSendPromptDebtorId] = useState<string | null>(
    null
  )
  const registerPayment = useRegisterDebtPayment()
  const statement = useDebtorStatement(sendPromptDebtorId ?? undefined)
  const balance = debt ? balanceOf(debt) : 0

  useEffect(() => {
    if (debt) setAmount(String(balance).replace(".", ","))
    setMethod("PIX")
    setError(null)
    setSendPromptDebtorId(null)
  }, [debt, balance])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!debt?.debtor) return
    const parsedAmount = Number(amount.replace(",", "."))
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0)
      return setError("Informe um valor válido.")
    if (parsedAmount > balance) return setError("O valor excede o saldo.")

    try {
      setError(null)
      await registerPayment.mutateAsync({
        debtorId: debt.debtor.id,
        input: { amount: parsedAmount, method },
      })
      setSendPromptDebtorId(debt.debtor.id)
    } catch (cause) {
      setError(getApiErrorMessage(cause))
    }
  }

  if (sendPromptDebtorId) {
    return (
      <Dialog
        onOpenChange={(open) => !open && onClose()}
        open={Boolean(debt)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pagamento registrado</DialogTitle>
            <DialogDescription>
              Deseja enviar o extrato atualizado para{" "}
              {debt?.debtor?.name ?? debt?.clientName ?? "o cliente"} pelo
              WhatsApp?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose} type="button" variant="outline">
              Não, obrigado
            </Button>
            {statement.data?.debtor.phone ? (
              <a
                className={cn(buttonVariants({ variant: "outline" }))}
                href={whatsappStatementLink(statement.data)}
                onClick={onClose}
                rel="noreferrer"
                target="_blank"
              >
                <MessageCircle className="size-4" /> Enviar no WhatsApp
              </a>
            ) : (
              <Button
                disabled
                title={
                  statement.isLoading
                    ? "Carregando..."
                    : "Cliente sem telefone cadastrado"
                }
                type="button"
                variant="outline"
              >
                {statement.isLoading && (
                  <LoaderCircle className="size-4 animate-spin" />
                )}
                <MessageCircle className="size-4" /> Enviar no WhatsApp
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={Boolean(debt)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Receber pagamento</DialogTitle>
          <DialogDescription>
            {debt?.debtor?.name ?? debt?.clientName ?? "Cliente"}, saldo de{" "}
            {formatCurrency(balance)} em {debt?.salesCount ?? 0} venda
            {debt?.salesCount === 1 ? "" : "s"}. O valor é aplicado nas vendas
            mais antigas primeiro.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-medium">
            Valor recebido
            <Input
              className="h-10 rounded-xl"
              inputMode="decimal"
              onChange={(event) =>
                setAmount(
                  event.target.value
                    .replace(/[^0-9,]/g, "")
                    .replace(/(,.*),/g, "$1")
                )
              }
              value={amount}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Forma de pagamento
            <Select
              onValueChange={(value) => setMethod(value as PaymentMethod)}
              value={method}
            >
              <SelectTrigger className="h-10! rounded-xl!">
                <span>{paymentMethods[method]}</span>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(paymentMethods).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              disabled={registerPayment.isPending}
              type="submit"
            >
              {registerPayment.isPending && (
                <LoaderCircle className="size-4 animate-spin" />
              )}
              Confirmar recebimento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
