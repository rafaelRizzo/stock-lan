import { useState } from "react"
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  CalendarDays,
  FileText,
  HandCoins,
  PackageCheck,
  Printer,
  ReceiptText,
  WalletCards,
} from "lucide-react"
import { format, subDays } from "date-fns"
import { ptBR } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useDashboardSummary } from "@/hooks/reports/use-dashboard-summary"
import type { DashboardSummary } from "@/services/reports.service"

type CashFlowPoint = DashboardSummary["cashFlow"][number]

export function ReportsPage() {
  const [period, setPeriod] = useState(getCurrentMonthPeriod)
  const summary = useDashboardSummary(true, period)
  const data = summary.data
  const cashFlow = data?.cashFlow ?? []
  const totalIncome = sum(cashFlow, "income")
  const totalExpense = sum(cashFlow, "expense")
  const balance = totalIncome - totalExpense

  function exportCsv() {
    if (!data) return

    const generatedAt = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date())
    const rows = [
      ["Relatório financeiro", ""],
      ["Gerado em", generatedAt],
      [],
      ["Indicador", "Valor"],
      ["Faturamento", number(data.revenue)],
      ["A receber", number(data.receivables)],
      ["Despesas pagas", number(data.expenses)],
      ["Reposição de estoque", number(data.stockReplenishment)],
      ["Alertas de estoque", data.lowStock],
      ["Entradas recebidas", totalIncome],
      ["Saídas", totalExpense],
      ["Saldo do período", balance],
      [],
      ["Fluxo de caixa", "", "", ""],
      ["Período", formatPeriod(period)],
      ["Data", "Entradas", "Saídas", "Saldo"],
      ...cashFlow.map((point) => [
        formatDate(point.date),
        number(point.income),
        number(point.expense),
        number(point.income) - number(point.expense),
      ]),
    ]
    const csv = `\uFEFF${rows
      .map((row) => row.map(escapeCsv).join(";"))
      .join("\n")}`
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    )
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "relatorio-financeiro.csv"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="print-report mx-auto w-full max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:mb-6">
        <div>
          <p className="text-sm text-muted-foreground">Financeiro</p>
          <h2 className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-[-0.045em] print:text-2xl">
            <FileText className="size-7 text-[#2e7152] print:size-6" />
            Relatórios
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Indicadores e fluxo de caixa de {formatPeriod(period)}.
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button
            disabled={!data || summary.isLoading}
            onClick={exportCsv}
            size="lg"
            variant="outline"
          >
            <Download /> Exportar CSV
          </Button>
          <Button onClick={() => window.print()} size="lg">
            <Printer /> Imprimir
          </Button>
        </div>
      </div>

      <section className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[#e5e9e4] bg-background p-3 dark:border-border print:hidden">
        <span className="px-2 text-sm font-medium">Período</span>
        <DateRangePicker onChange={setPeriod} value={period} />
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setPeriod(getTodayPeriod())}
            size="sm"
            variant="ghost"
          >
            Hoje
          </Button>
          <Button
            onClick={() => setPeriod(getLastDaysPeriod(7))}
            size="sm"
            variant="ghost"
          >
            7 dias
          </Button>
          <Button
            onClick={() => setPeriod(getCurrentMonthPeriod())}
            size="sm"
            variant="ghost"
          >
            Este mês
          </Button>
          <Button
            onClick={() => setPeriod(getPreviousMonthPeriod())}
            size="sm"
            variant="ghost"
          >
            Mês anterior
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-3">
        <ReportMetric
          icon={HandCoins}
          label="Faturamento"
          loading={summary.isLoading}
          tone="green"
          value={formatCurrency(data?.revenue)}
        />
        <ReportMetric
          icon={WalletCards}
          label="Despesas pagas"
          loading={summary.isLoading}
          tone="rose"
          value={formatCurrency(data?.expenses)}
        />
        <ReportMetric
          icon={PackageCheck}
          label="Reposição de estoque"
          loading={summary.isLoading}
          tone="amber"
          value={formatCurrency(data?.stockReplenishment)}
        />
        <ReportMetric
          icon={ArrowUpRight}
          label="Entradas recebidas"
          loading={summary.isLoading}
          tone="green"
          value={formatCurrency(totalIncome)}
        />
        <ReportMetric
          icon={ArrowDownRight}
          label="Saídas do período"
          loading={summary.isLoading}
          tone="rose"
          value={formatCurrency(totalExpense)}
        />
        <ReportMetric
          icon={ReceiptText}
          label="Saldo do período"
          loading={summary.isLoading}
          tone={balance >= 0 ? "green" : "rose"}
          value={formatCurrency(balance)}
        />
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-[#e5e9e4] bg-background dark:border-border print:break-inside-avoid">
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6">
          <div>
            <h3 className="text-base font-semibold">Fluxo de caixa</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Entradas recebidas, despesas pagas e compras para reposição no
              período selecionado.
            </p>
          </div>
          <span className="rounded-xl bg-[#eaf4ec] px-3 py-1.5 text-sm font-semibold text-[#2e7152] dark:bg-emerald-950 dark:text-emerald-300">
            {formatCurrency(balance)}
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Entradas</TableHead>
              <TableHead className="text-right">Saídas</TableHead>
              <TableHead className="text-right">Saldo diário</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={4}>
                    <span className="block h-4 animate-pulse rounded bg-muted" />
                  </TableCell>
                </TableRow>
              ))
            ) : cashFlow.length ? (
              cashFlow.map((point) => (
                <CashFlowRow key={point.date} point={point} />
              ))
            ) : (
              <TableRow>
                <TableCell
                  className="py-10 text-center text-muted-foreground"
                  colSpan={4}
                >
                  Sem movimentações financeiras no período.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {!summary.isLoading && cashFlow.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell>Total</TableCell>
                <TableCell className="text-right text-[#2e7152]">
                  {formatCurrency(totalIncome)}
                </TableCell>
                <TableCell className="text-right text-destructive">
                  {formatCurrency(totalExpense)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(balance)}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </section>
    </div>
  )
}

function CashFlowRow({ point }: { point: CashFlowPoint }) {
  const income = number(point.income)
  const expense = number(point.expense)
  const dailyBalance = income - expense

  return (
    <TableRow>
      <TableCell className="font-medium">{formatDate(point.date)}</TableCell>
      <TableCell className="text-right text-[#2e7152]">
        {formatCurrency(income)}
      </TableCell>
      <TableCell className="text-right text-destructive">
        {formatCurrency(expense)}
      </TableCell>
      <TableCell
        className={`text-right font-medium ${dailyBalance < 0 ? "text-destructive" : "text-[#2e7152]"}`}
      >
        {formatCurrency(dailyBalance)}
      </TableCell>
    </TableRow>
  )
}

function ReportMetric({
  icon: Icon,
  label,
  loading,
  tone,
  value,
}: {
  icon: typeof FileText
  label: string
  loading: boolean
  tone: "green" | "amber" | "rose"
  value: string
}) {
  const tones = {
    green:
      "bg-[#eaf4ec] text-[#2e7152] dark:bg-emerald-950 dark:text-emerald-300",
    amber: "bg-[#fff2da] text-[#a46711] dark:bg-amber-950 dark:text-amber-300",
    rose: "bg-[#fdebed] text-[#b84c5d] dark:bg-rose-950 dark:text-rose-300",
  }

  return (
    <article className="rounded-2xl border border-[#e5e9e4] bg-background p-5 dark:border-border print:break-inside-avoid">
      <span
        className={`grid size-9 place-items-center rounded-xl ${tones[tone]}`}
      >
        <Icon className="size-4" />
      </span>
      <p className="mt-5 text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tracking-[-0.04em] ${loading ? "animate-pulse text-muted-foreground/30" : ""}`}
      >
        {loading ? "R$ ..." : value}
      </p>
    </article>
  )
}

function DateRangePicker({
  onChange,
  value,
}: {
  onChange: (value: { startDate: string; endDate: string }) => void
  value: { startDate: string; endDate: string }
}) {
  const selected = {
    from: parseDate(value.startDate),
    to: parseDate(value.endDate),
  }

  return (
    <Popover modal>
      <PopoverTrigger
        render={
          <Button
            className="h-9 min-w-64 justify-start rounded-xl border-[#dce3de] bg-input/50 px-3 text-left font-normal shadow-none hover:bg-input/70 dark:border-border dark:bg-input/50 dark:hover:bg-input/70"
            variant="outline"
          />
        }
      >
        <CalendarDays className="mr-2 size-4 text-muted-foreground" />
        {formatPeriod(value)}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          locale={ptBR}
          mode="range"
          numberOfMonths={2}
          onSelect={(range) => {
            if (!range?.from) return
            onChange({
              startDate: format(range.from, "yyyy-MM-dd"),
              endDate: format(range.to ?? range.from, "yyyy-MM-dd"),
            })
          }}
          selected={selected}
        />
      </PopoverContent>
    </Popover>
  )
}

function sum(points: CashFlowPoint[], key: "income" | "expense") {
  return points.reduce((total, point) => total + number(point[key]), 0)
}

function number(value: string | number | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatCurrency(value: string | number | undefined) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(number(value))
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`))
}

function formatPeriod({
  startDate,
  endDate,
}: {
  startDate: string
  endDate: string
}) {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  if (startDate === endDate)
    return format(start, "dd 'de' MMM 'de' yyyy", { locale: ptBR })
  const sameYear = start.getFullYear() === end.getFullYear()
  const sameMonth = sameYear && start.getMonth() === end.getMonth()
  const startFormat = sameMonth
    ? "dd"
    : sameYear
      ? "dd 'de' MMM"
      : "dd 'de' MMM 'de' yyyy"
  return `${format(start, startFormat, { locale: ptBR })} a ${format(end, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}`
}

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`)
}

function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd")
}

function getTodayPeriod() {
  const today = toDateKey(new Date())
  return { startDate: today, endDate: today }
}

function getLastDaysPeriod(days: number) {
  return {
    startDate: toDateKey(subDays(new Date(), days - 1)),
    endDate: toDateKey(new Date()),
  }
}

function getCurrentMonthPeriod() {
  const today = new Date()
  return {
    startDate: toDateKey(new Date(today.getFullYear(), today.getMonth(), 1)),
    endDate: toDateKey(today),
  }
}

function getPreviousMonthPeriod() {
  const today = new Date()
  return {
    startDate: toDateKey(
      new Date(today.getFullYear(), today.getMonth() - 1, 1)
    ),
    endDate: toDateKey(new Date(today.getFullYear(), today.getMonth(), 0)),
  }
}

function escapeCsv(value: string | number) {
  const text = String(value)
  return /[;"\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}
