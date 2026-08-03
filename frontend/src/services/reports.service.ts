import { http } from "@/lib/http"

export type DashboardSummary = {
  revenue: string | number
  receivables: string | number
  expenses: string | number
  profit: string | number
  lowStock: number
  stockReplenishment: string | number
  cashFlow: Array<{
    date: string
    income: string | number
    expense: string | number
  }>
}

export type DashboardSummaryParams = {
  startDate?: string
  endDate?: string
}

export type DebtReport = {
  id: string
  clientName: string | null
  total: string | number
  createdAt: string
  debtor: { id: string; name: string } | null
  payments: Array<{
    id: string
    amount: string | number
    method: "CASH" | "PIX" | "CARD" | "BANK_TRANSFER" | "OTHER"
    paidAt: string
  }>
}

export type PaginatedDebtReports = {
  data: DebtReport[]
  total: number
  totalPage: number
  page: number
  limit: number
}

export const reportsService = {
  async dashboard(params?: DashboardSummaryParams) {
    const { data } = await http.get<DashboardSummary>("/reports/dashboard", {
      params,
    })
    return data
  },
  async debts(params: {
    page: number
    limit: number
    dateFrom?: string
    dateTo?: string
  }) {
    const { data } = await http.get<PaginatedDebtReports>("/reports/debts", {
      params,
    })
    return data
  },
}
