import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  ChevronLeft,
  ChevronRight,
  HandCoins,
  History,
  LoaderCircle,
  MessageCircle,
  Printer,
  WalletCards,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { DateRangePicker } from "@/components/shared/date-range-picker"
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
import type {
  DebtorStatement,
  DebtorStatementSale,
  DebtReport,
} from "@/services/reports.service"
import type { PaymentMethod } from "@/services/sales.service"

const pageSize = DEFAULT_PAGE_SIZE
const selectClass =
  "h-10! w-full rounded-xl! border-[#dce3de]! bg-input/50! px-2.5! py-1! text-sm shadow-none data-[size=default]:h-10! dark:border-border!"

const paymentMethods: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CARD: "Cartão",
  BANK_TRANSFER: "Transferência",
  OTHER: "Outro",
}

const saleStatuses: Record<DebtorStatementSale["status"], string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  FREE: "Cortesia",
  DEBT: "A prazo",
  CANCELED: "Cancelada",
}

const saleStatusStyles: Record<DebtorStatementSale["status"], string> = {
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  FREE: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  DEBT: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  CANCELED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
}

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
  const registerPayment = useRegisterDebtPayment()
  const balance = debt ? balanceOf(debt) : 0

  useEffect(() => {
    if (debt) setAmount(String(balance).replace(".", ","))
    setMethod("PIX")
    setError(null)
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
      onClose()
    } catch (cause) {
      setError(getApiErrorMessage(cause))
    }
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

function DebtorStatementDialog({
  debtorId,
  onClose,
}: {
  debtorId: string | null
  onClose: () => void
}) {
  const statement = useDebtorStatement(debtorId ?? undefined)

  return (
    <Dialog
      onOpenChange={(open) => !open && onClose()}
      open={Boolean(debtorId)}
    >
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {statement.data?.debtor.name ?? "Extrato do devedor"}
          </DialogTitle>
          <DialogDescription>
            Histórico completo de vendas e recebimentos.
          </DialogDescription>
        </DialogHeader>
        {statement.isLoading && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Carregando histórico...
          </p>
        )}
        {statement.data && (
          <StatementBody statement={statement.data} />
        )}
        <DialogFooter>
          <Button onClick={onClose} type="button" variant="outline">
            Fechar
          </Button>
          {statement.data?.debtor.phone ? (
            <a
              className={buttonVariants({ variant: "outline" })}
              href={whatsappStatementLink(statement.data)}
              rel="noreferrer"
              target="_blank"
            >
              <MessageCircle className="size-4" /> Enviar no WhatsApp
            </a>
          ) : (
            <Button
              disabled
              title="Devedor sem telefone cadastrado"
              type="button"
              variant="outline"
            >
              <MessageCircle className="size-4" /> Enviar no WhatsApp
            </Button>
          )}
          <Button
            className="bg-[#173f31] text-white hover:bg-[#245742]"
            disabled={!statement.data}
            onClick={() => statement.data && printStatement(statement.data)}
            type="button"
          >
            <Printer className="size-4" /> Imprimir extrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StatementBody({ statement }: { statement: DebtorStatement }) {
  const totalDebt = statement.sales.reduce(
    (total, sale) => total + Number(sale.total),
    0
  )
  const totalPaid = statement.sales.reduce(
    (total, sale) => total + paidOf(sale),
    0
  )
  const totalBalance = totalDebt - totalPaid
  const payments = mergePayments(statement.sales)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatementMetric label="Total devido" value={totalDebt} />
        <StatementMetric
          label="Total recebido"
          tone="green"
          value={totalPaid}
        />
        <StatementMetric label="Saldo atual" tone="rose" value={totalBalance} />
      </div>
      {statement.sales.length === 0 && (
        <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Nenhuma venda encontrada para este devedor.
        </p>
      )}
      {statement.sales.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Vendas</p>
          <div className="space-y-3">
            {statement.sales.map((sale) => (
              <div
                className="rounded-xl border border-[#e5e9e4] p-3 dark:border-border"
                key={sale.id}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      {formatDate(sale.createdAt)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total {formatCurrency(sale.total)} · Saldo{" "}
                      {formatCurrency(balanceOf(sale))}
                    </p>
                  </div>
                  <Badge className={saleStatusStyles[sale.status]}>
                    {saleStatuses[sale.status]}
                  </Badge>
                </div>
                {(sale.items ?? []).length > 0 && (
                  <ul className="mt-2 space-y-1 border-t border-dashed border-border pt-2">
                    {sale.items.map((item) => (
                      <li
                        className="flex items-center justify-between text-xs text-muted-foreground"
                        key={item.id}
                      >
                        <span>
                          {String(item.quantity).replace(".", ",")}x{" "}
                          {item.product.name}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(item.priceTotal)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Recebimentos
        </p>
        {payments.length > 0 ? (
          <ul className="space-y-1 rounded-xl border border-[#e5e9e4] p-3 dark:border-border">
            {payments.map((payment) => (
              <li
                className="flex items-center justify-between text-xs text-muted-foreground"
                key={`${payment.paidAt}:${payment.method}`}
              >
                <span>
                  {formatDate(payment.paidAt)} ·{" "}
                  {paymentMethods[payment.method]}
                </span>
                <span className="font-medium text-[#2e7152] dark:text-emerald-300">
                  {formatCurrency(payment.amount)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
            Nenhum pagamento registrado.
          </p>
        )}
      </div>
    </div>
  )
}

function StatementMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: "green" | "rose"
}) {
  const toneClass =
    tone === "green"
      ? "text-[#2e7152] dark:text-emerald-300"
      : tone === "rose"
        ? "text-[#b84c5d] dark:text-rose-300"
        : ""

  return (
    <div className="rounded-xl border border-[#e5e9e4] p-3 dark:border-border">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${toneClass}`}>
        {formatCurrency(value)}
      </p>
    </div>
  )
}

// Largura da bobina da impressora térmica. Troque para "58mm" se a impressora for de 58mm.
const RECEIPT_PAPER_WIDTH = "80mm"

function printStatement(statement: DebtorStatement) {
  const saleLines = statement.sales.flatMap((sale) => [
    `<div class="row date">${formatDate(sale.createdAt)}</div>`,
    `<div class="row sale"><span>Venda (${saleStatuses[sale.status]})</span><span>${formatCurrency(sale.total)}</span></div>`,
    ...(sale.items ?? []).map(
      (item) =>
        `<div class="row item"><span>${String(item.quantity).replace(".", ",")}x ${escapeHtml(item.product.name)}</span><span>${formatCurrency(item.priceTotal)}</span></div>`
    ),
  ])
  const paymentLines = mergePayments(statement.sales).flatMap((payment) => [
    `<div class="row date">${formatDate(payment.paidAt)}</div>`,
    `<div class="row paid"><span>Pagamento (${paymentMethods[payment.method]})</span><span>- ${formatCurrency(payment.amount)}</span></div>`,
  ])
  const totalDebt = statement.sales.reduce(
    (total, sale) => total + Number(sale.total),
    0
  )
  const totalPaid = statement.sales.reduce(
    (total, sale) => total + paidOf(sale),
    0
  )
  const generatedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date())
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Extrato - ${escapeHtml(statement.debtor.name)}</title>
<style>
  @page { size: ${RECEIPT_PAPER_WIDTH} auto; margin: 0; }
  * { box-sizing: border-box; }
  body {
    width: ${RECEIPT_PAPER_WIDTH};
    margin: 0 auto;
    padding: 6mm 3mm;
    font-family: "Courier New", monospace;
    font-size: 11px;
    line-height: 1.35;
    color: #000;
  }
  h1 { font-size: 13px; margin: 0 0 2px; text-align: center; }
  p.meta { text-align: center; margin: 0 0 8px; font-size: 10px; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 6px; }
  .row.date { color: #444; font-size: 10px; margin-top: 4px; }
  .row.sale { font-weight: 700; }
  .row.item { padding-left: 8px; font-size: 10px; }
  .row.paid { font-weight: 700; }
  .summary .row { margin: 1px 0; }
</style>
</head>
<body>
  <h1>Extrato de ${escapeHtml(statement.debtor.name)}</h1>
  <p class="meta">Gerado em ${generatedAt}</p>
  <div class="divider"></div>
  ${saleLines.join("")}
  <div class="divider"></div>
  ${paymentLines.length > 0 ? paymentLines.join("") : '<div class="row"><span>Nenhum pagamento registrado.</span></div>'}
  <div class="divider"></div>
  <div class="summary">
    <div class="row"><span>Total devido</span><span>${formatCurrency(totalDebt)}</span></div>
    <div class="row"><span>Total recebido</span><span>${formatCurrency(totalPaid)}</span></div>
    <div class="row"><span>Saldo</span><span>${formatCurrency(totalDebt - totalPaid)}</span></div>
  </div>
</body>
</html>`
  const printWindow = window.open("", "_blank", "width=400,height=600")
  if (!printWindow) return
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.onafterprint = () => printWindow.close()
  printWindow.focus()
  printWindow.print()
}

function whatsappStatementLink(statement: DebtorStatement) {
  const digits = (statement.debtor.phone ?? "").replace(/\D/g, "")
  const withDdi = digits.startsWith("55") ? digits : `55${digits}`
  const text = buildWhatsappMessage(statement)
  return `https://wa.me/${withDdi}?text=${encodeURIComponent(text)}`
}

function buildWhatsappMessage(statement: DebtorStatement) {
  const totalDebt = statement.sales.reduce(
    (total, sale) => total + Number(sale.total),
    0
  )
  const totalPaid = statement.sales.reduce(
    (total, sale) => total + paidOf(sale),
    0
  )
  const saleBlocks = statement.sales.map((sale) => {
    const itemLines = (sale.items ?? []).map(
      (item) =>
        `${String(item.quantity).replace(".", ",")}x ${item.product.name} - ${formatCurrency(item.priceTotal)}`
    )
    return [
      formatDate(sale.createdAt),
      ...itemLines,
      `Total: ${formatCurrency(sale.total)} · Saldo: ${formatCurrency(balanceOf(sale))}`,
    ].join("\n")
  })
  const payments = mergePayments(statement.sales)
  const paymentLines = payments.map(
    (payment) =>
      `${formatDate(payment.paidAt)} · ${paymentMethods[payment.method]} - ${formatCurrency(payment.amount)}`
  )

  return [
    "Olá, segue seu extrato de conta:",
    "",
    "Vendas:",
    saleBlocks.join("\n\n"),
    "",
    "Recebimentos:",
    payments.length > 0
      ? paymentLines.join("\n")
      : "Nenhum pagamento registrado.",
    "",
    `Total devido: ${formatCurrency(totalDebt)}`,
    `Total recebido: ${formatCurrency(totalPaid)}`,
    `Saldo: ${formatCurrency(totalDebt - totalPaid)}`,
  ].join("\n")
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

type PayableSale = {
  total: string | number
  payments: Array<{ amount: string | number }>
}

function paidOf(sale: PayableSale) {
  return sale.payments.reduce(
    (total, payment) => total + Number(payment.amount),
    0
  )
}

function balanceOf(sale: PayableSale) {
  return Math.max(0, Number(sale.total) - paidOf(sale))
}

function mergePayments(
  sales: Array<{
    payments: Array<{
      amount: string | number
      method: PaymentMethod
      paidAt: string
    }>
  }>
) {
  const merged = new Map<
    string,
    { paidAt: string; method: PaymentMethod; amount: number }
  >()
  for (const sale of sales) {
    for (const payment of sale.payments) {
      const key = `${payment.paidAt}:${payment.method}`
      const existing = merged.get(key)
      if (existing) existing.amount += Number(payment.amount)
      else
        merged.set(key, {
          paidAt: payment.paidAt,
          method: payment.method,
          amount: Number(payment.amount),
        })
    }
  }
  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
  )
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(value)
  )
}
