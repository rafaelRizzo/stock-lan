import { Link, useLocation } from "@tanstack/react-router"
import {
  ArrowUpRight,
  Bell,
  Box,
  CircleDollarSign,
  HandCoins,
  PackageCheck,
  ReceiptText,
  TrendingUp,
} from "lucide-react"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { pageTitles } from "@/components/dashboard/dashboard-navigation"
import { ProductsPage } from "@/components/products/products-page"
import { QuantityTypesPage } from "@/components/quantity-types/quantity-types-page"
import { ReportsPage } from "@/components/reports/reports-page"
import { SuppliersPage } from "@/components/suppliers/suppliers-page"
import { DebtorsPage } from "@/components/debtors/debtors-page"
import { ExpensesPage } from "@/components/expenses/expenses-page"
import { SalesPage } from "@/components/sales/sales-page"
import { StockBatchesPage } from "@/components/stock/stock-batches-page"
import { StockMovementsPage } from "@/components/stock/stock-movements-page"
import { StockAlertsPage } from "@/components/stock/stock-alerts-page"
import { UsersPage } from "@/components/users/users-page"
import { Button } from "@/components/ui/button"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useCurrentUser } from "@/hooks/auth/use-current-user"
import { useDashboardSummary } from "@/hooks/reports/use-dashboard-summary"
import { useStockAlerts } from "@/hooks/stock/use-stock-batches"
import type { DashboardSummary } from "@/services/reports.service"

export function DashboardScreen() {
  const { pathname } = useLocation()
  const { data: user } = useCurrentUser()
  const isOverview = pathname === "/dashboard"
  const title = pageTitles.get(pathname) ?? "Módulo"

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset className="min-h-svh overflow-hidden bg-[#f7f8f6] dark:bg-background print:m-0! print:rounded-none! print:bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#e5e9e4] bg-background/80 px-4 backdrop-blur-sm sm:px-6 dark:border-border print:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                Stock LAN
              </p>
              <h1 className="truncate text-sm font-semibold tracking-[-0.02em]">
                {title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              aria-label="Notificações"
              className="rounded-xl"
              size="icon-sm"
              variant="ghost"
            >
              <Bell className="size-4" />
            </Button>
            <Link
              className="hidden h-8 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-sm font-medium hover:bg-muted sm:flex"
              params={{ _splat: "sales" }}
              to="/dashboard/$"
            >
              <ReceiptText className="size-4" /> Nova venda
            </Link>
          </div>
        </header>

        <div className="flex flex-1 flex-col overflow-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8 print:p-0">
          {isOverview ? (
            <DashboardOverview userName={user?.name} />
          ) : pathname === "/dashboard/users" ? (
            <UsersPage />
          ) : pathname === "/dashboard/products" ? (
            <ProductsPage />
          ) : pathname === "/dashboard/quantity-types" ? (
            <QuantityTypesPage />
          ) : pathname === "/dashboard/suppliers" ? (
            <SuppliersPage />
          ) : pathname === "/dashboard/debtors" ? (
            <DebtorsPage />
          ) : pathname === "/dashboard/sales" ? (
            <SalesPage />
          ) : pathname === "/dashboard/stock/batches" ? (
            <StockBatchesPage />
          ) : pathname === "/dashboard/stock/movements" ? (
            <StockMovementsPage />
          ) : pathname === "/dashboard/stock/alerts" ? (
            <StockAlertsPage />
          ) : pathname === "/dashboard/expenses" ? (
            <ExpensesPage />
          ) : pathname === "/dashboard/reports" ? (
            <ReportsPage />
          ) : (
            <ModulePlaceholder title={title} />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function DashboardOverview({ userName }: { userName?: string }) {
  const { data, isLoading } = useDashboardSummary(true)
  const alerts = useStockAlerts({ page: 1, limit: 1 })
  const firstName = userName?.split(" ")[0]
  const cashFlowBalance = data?.cashFlow.reduce(
    (total, point) => total + Number(point.income) - Number(point.expense),
    0
  )

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground capitalize">
            {new Intl.DateTimeFormat("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date())}
          </p>
          <h2 className="mt-1 text-3xl font-semibold tracking-[-0.045em]">
            {firstName ? `Olá, ${firstName}.` : "Visão geral"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Acompanhe os principais indicadores da sua operação.
          </p>
        </div>
        <Link
          className="inline-flex h-9 w-fit items-center gap-1.5 rounded-xl bg-[#173f31] px-4 text-sm font-semibold text-white shadow-[0_10px_20px_-12px_rgba(23,63,49,0.8)] hover:bg-[#245742]"
          params={{ _splat: "stock/batches" }}
          to="/dashboard/$"
        >
          <PackageCheck className="size-4" /> Registrar entrada
        </Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={CircleDollarSign}
          label="Faturamento"
          loading={isLoading}
          tone="green"
          value={formatCurrency(data?.revenue)}
        />
        <MetricCard
          icon={HandCoins}
          label="A receber"
          loading={isLoading}
          tone="amber"
          value={formatCurrency(data?.receivables)}
        />
        <MetricCard
          icon={ReceiptText}
          label="Despesas pagas"
          loading={isLoading}
          tone="rose"
          value={formatCurrency(data?.expenses)}
        />
        <MetricCard
          icon={PackageCheck}
          label="Reposição de estoque"
          loading={isLoading}
          tone="amber"
          value={formatCurrency(data?.stockReplenishment)}
        />
        <MetricCard
          icon={Box}
          label="Alertas de estoque"
          loading={alerts.isLoading}
          tone="blue"
          value={alerts.data?.total.toString() ?? "0"}
        />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
        <div className="rounded-2xl border border-[#e5e9e4] bg-background p-5 sm:p-6 dark:border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">Fluxo de caixa</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Entradas recebidas e saídas operacionais nos últimos 10 dias.
              </p>
            </div>
            <span className="grid size-9 place-items-center rounded-xl bg-[#eaf4ec] text-[#2e7152] dark:bg-emerald-950 dark:text-emerald-300">
              <TrendingUp className="size-4" />
            </span>
          </div>
          <p className="mt-10 text-4xl font-semibold tracking-[-0.05em]">
            {formatCurrency(cashFlowBalance)}
          </p>
          <CashFlowChart data={data} loading={isLoading} />
        </div>
        <div className="rounded-2xl border border-[#e5e9e4] bg-background p-5 sm:p-6 dark:border-border">
          <p className="text-sm font-semibold">Ações rápidas</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Atalhos da operação.
          </p>
          <div className="mt-5 space-y-2">
            <QuickAction
              icon={ReceiptText}
              label="Registrar venda"
              to="/dashboard/sales"
            />
            <QuickAction
              icon={PackageCheck}
              label="Adicionar entrada"
              to="/dashboard/stock/batches"
            />
            <QuickAction
              icon={Box}
              label="Consultar estoque"
              to="/dashboard/products"
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function CashFlowChart({
  data,
  loading,
}: {
  data?: DashboardSummary
  loading: boolean
}) {
  const points = data?.cashFlow ?? []
  const max = Math.max(
    1,
    ...points.flatMap((point) => [Number(point.income), Number(point.expense)])
  )

  return (
    <div className="mt-8 rounded-xl bg-[linear-gradient(135deg,rgba(76,146,116,0.13),rgba(76,146,116,0.02))] px-3 pt-3 pb-2">
      <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-sm bg-[#4c9274]" /> Entradas
        </span>
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-sm bg-[#d46a78]" /> Saídas
        </span>
      </div>
      <div className="flex h-28 items-end gap-1.5">
        {loading
          ? Array.from({ length: 10 }).map((_, index) => (
              <span
                className="h-full flex-1 animate-pulse rounded-sm bg-muted/60"
                key={index}
              />
            ))
          : points.map((point) => (
              <div
                className="flex h-full min-w-0 flex-1 flex-col justify-end"
                key={point.date}
              >
                <div className="flex h-full items-end justify-center gap-0.5">
                  <span
                    aria-label={`Entradas: ${formatCurrency(point.income)}`}
                    className="w-full max-w-3 rounded-t-sm bg-[#4c9274]"
                    style={{ height: `${(Number(point.income) / max) * 100}%` }}
                    title={`Entradas: ${formatCurrency(point.income)}`}
                  />
                  <span
                    aria-label={`Saídas: ${formatCurrency(point.expense)}`}
                    className="w-full max-w-3 rounded-t-sm bg-[#d46a78]"
                    style={{
                      height: `${(Number(point.expense) / max) * 100}%`,
                    }}
                    title={`Saídas: ${formatCurrency(point.expense)}`}
                  />
                </div>
                <span className="mt-2 text-center text-[10px] text-muted-foreground">
                  {point.date.slice(8)}
                </span>
              </div>
            ))}
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  loading,
  tone,
  value,
}: {
  icon: typeof Box
  label: string
  loading: boolean
  tone: "green" | "amber" | "rose" | "blue"
  value: string
}) {
  const tones = {
    green:
      "bg-[#eaf4ec] text-[#2e7152] dark:bg-emerald-950 dark:text-emerald-300",
    amber: "bg-[#fff2da] text-[#a46711] dark:bg-amber-950 dark:text-amber-300",
    rose: "bg-[#fdebed] text-[#b84c5d] dark:bg-rose-950 dark:text-rose-300",
    blue: "bg-[#e7f1fb] text-[#3976a9] dark:bg-sky-950 dark:text-sky-300",
  }
  return (
    <article className="rounded-2xl border border-[#e5e9e4] bg-background p-5 dark:border-border">
      <div className="flex items-center justify-between">
        <span
          className={`grid size-9 place-items-center rounded-xl ${tones[tone]}`}
        >
          <Icon className="size-4" />
        </span>
        <ArrowUpRight className="size-4 text-muted-foreground/60" />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tracking-[-0.04em] ${loading ? "animate-pulse text-muted-foreground/30" : ""}`}
      >
        {loading ? "R$ ..." : value}
      </p>
    </article>
  )
}

function QuickAction({
  icon: Icon,
  label,
  to,
}: {
  icon: typeof Box
  label: string
  to: string
}) {
  return (
    <Link
      className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-sm font-medium transition-colors hover:border-border hover:bg-muted/60"
      params={{ _splat: to.replace("/dashboard/", "") }}
      to="/dashboard/$"
    >
      <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground dark:bg-zinc-800 dark:text-zinc-300">
        <Icon className="size-4" />
      </span>
      <span className="flex-1">{label}</span>
      <ArrowUpRight className="size-4 text-muted-foreground" />
    </Link>
  )
}

function ModulePlaceholder({ title }: { title: string }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 items-center justify-center">
      <div className="max-w-sm text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#eaf4ec] text-[#2e7152] dark:bg-emerald-950 dark:text-emerald-300">
          <PackageCheck className="size-6" />
        </span>
        <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          O layout deste módulo será implementado nas próximas etapas.
        </p>
      </div>
    </div>
  )
}

function formatCurrency(
  value: DashboardSummary[keyof DashboardSummary] | undefined
) {
  const amount =
    typeof value === "number" || typeof value === "string" ? Number(value) : 0
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(amount) ? amount : 0)
}
