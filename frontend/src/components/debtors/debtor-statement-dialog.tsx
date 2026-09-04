import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, MessageCircle, Printer } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { DateRangePicker } from "@/components/shared/date-range-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useDebtorStatement } from "@/hooks/reports/use-dashboard-summary"
import { cn } from "@/lib/utils"
import type {
  DebtorStatement,
  DebtorStatementSale,
} from "@/services/reports.service"
import type { PaymentMethod } from "@/services/sales.service"

const SALES_PAGE_SIZE = 5

export const paymentMethods: Record<PaymentMethod, string> = {
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

export function DebtorStatementDialog({
  debtorId,
  onClose,
}: {
  debtorId: string | null
  onClose: () => void
}) {
  const statement = useDebtorStatement(debtorId ?? undefined)
  const [saleDateFrom, setSaleDateFrom] = useState("")
  const [saleDateTo, setSaleDateTo] = useState("")
  const [salesPage, setSalesPage] = useState(1)

  useEffect(() => {
    setSaleDateFrom("")
    setSaleDateTo("")
    setSalesPage(1)
  }, [debtorId])

  const filteredSales = useMemo(
    () =>
      statement.data
        ? filterSalesByDate(statement.data.sales, saleDateFrom, saleDateTo)
        : [],
    [statement.data, saleDateFrom, saleDateTo]
  )
  const filteredStatement = statement.data
    ? { ...statement.data, sales: filteredSales }
    : undefined

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
          <StatementBody
            filteredSales={filteredSales}
            onDateChange={(from, to) => {
              setSaleDateFrom(from)
              setSaleDateTo(to)
              setSalesPage(1)
            }}
            onPageChange={setSalesPage}
            page={salesPage}
            saleDateFrom={saleDateFrom}
            saleDateTo={saleDateTo}
            statement={statement.data}
          />
        )}
        <DialogFooter>
          <Button onClick={onClose} type="button" variant="outline">
            Fechar
          </Button>
          {statement.data?.debtor.phone ? (
            <a
              className={cn(buttonVariants({ variant: "outline" }))}
              href={whatsappStatementLink(filteredStatement!)}
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
            disabled={!filteredStatement}
            onClick={() =>
              filteredStatement && printStatement(filteredStatement)
            }
            type="button"
          >
            <Printer className="size-4" /> Imprimir extrato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StatementBody({
  filteredSales,
  onDateChange,
  onPageChange,
  page,
  saleDateFrom,
  saleDateTo,
  statement,
}: {
  filteredSales: DebtorStatementSale[]
  onDateChange: (from: string, to: string) => void
  onPageChange: (page: number) => void
  page: number
  saleDateFrom: string
  saleDateTo: string
  statement: DebtorStatement
}) {
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

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSales.length / SALES_PAGE_SIZE)
  )
  const pagedSales = filteredSales.slice(
    (page - 1) * SALES_PAGE_SIZE,
    page * SALES_PAGE_SIZE
  )

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
      {statement.sales.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          Nenhuma venda encontrada para este devedor.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-muted-foreground">
              Vendas
            </p>
            <DateRangePicker
              className="h-9! w-auto sm:w-56"
              dateFrom={saleDateFrom}
              dateTo={saleDateTo}
              onChange={onDateChange}
              placeholder="Filtrar por período"
            />
          </div>
          {filteredSales.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              Nenhuma venda no período selecionado.
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {pagedSales.map((sale) => (
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
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    Página {page} de {totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      aria-label="Vendas: página anterior"
                      disabled={page <= 1}
                      onClick={() => onPageChange(page - 1)}
                      size="icon-sm"
                      type="button"
                      variant="outline"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      aria-label="Vendas: próxima página"
                      disabled={page >= totalPages}
                      onClick={() => onPageChange(page + 1)}
                      size="icon-sm"
                      type="button"
                      variant="outline"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
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

const RECEIPT_STYLES = `
  * { box-sizing: border-box; }
  .receipt {
    width: ${RECEIPT_PAPER_WIDTH};
    margin: 0 auto;
    padding: 6mm 3mm;
    font-family: "Courier New", monospace;
    font-size: 11px;
    line-height: 1.35;
    color: #000;
    background: #fff;
  }
  .receipt h1 { font-size: 13px; margin: 0 0 2px; text-align: center; }
  .receipt p.meta { text-align: center; margin: 0 0 8px; font-size: 10px; }
  .receipt .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .receipt .row { display: table; width: 100%; }
  .receipt .row > span:first-child { display: table-cell; text-align: left; }
  .receipt .row > span:last-child { display: table-cell; text-align: right; white-space: nowrap; }
  .receipt .row.date { color: #444; font-size: 10px; margin-top: 4px; }
  .receipt .row.sale { font-weight: 700; }
  .receipt .row.item { padding-left: 8px; font-size: 10px; }
  .receipt .row.paid { font-weight: 700; }
  .receipt .summary .row { margin: 1px 0; }
`

function buildStatementReceiptHtml(statement: DebtorStatement) {
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

  return `<div class="receipt">
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
</div>`
}

function printStatement(statement: DebtorStatement) {
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Extrato - ${escapeHtml(statement.debtor.name)}</title>
<style>
  @page { size: ${RECEIPT_PAPER_WIDTH} auto; margin: 0; }
  body { margin: 0; }
  ${RECEIPT_STYLES}
</style>
</head>
<body>
${buildStatementReceiptHtml(statement)}
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

export function whatsappStatementLink(statement: DebtorStatement) {
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

export function paidOf(sale: PayableSale) {
  return sale.payments.reduce(
    (total, payment) => total + Number(payment.amount),
    0
  )
}

export function balanceOf(sale: PayableSale) {
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

function filterSalesByDate(
  sales: DebtorStatementSale[],
  dateFrom: string,
  dateTo: string
) {
  if (!dateFrom) return sales
  const from = new Date(`${dateFrom}T00:00:00`)
  const to = new Date(`${dateTo || dateFrom}T23:59:59.999`)
  return sales.filter((sale) => {
    const createdAt = new Date(sale.createdAt)
    return createdAt >= from && createdAt <= to
  })
}

export function formatCurrency(value: string | number) {
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
