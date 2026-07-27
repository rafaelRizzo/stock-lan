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

export const reportsService = {
  async dashboard(params?: DashboardSummaryParams) {
    const { data } = await http.get<DashboardSummary>("/reports/dashboard", {
      params,
    })
    return data
  },
}
