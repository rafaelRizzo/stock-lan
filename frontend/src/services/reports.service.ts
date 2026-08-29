import { http } from "@/lib/http"

export type DashboardSummary = {
  revenue: string | number
  receivables: string | number
  expenses: string | number
  profit: string | number
  lowStock: number
  stockReplenishment: string | number
  cashBalance: string | number
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
  salesCount: number
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

export type DebtorStatementSale = {
  id: string
  clientName: string | null
  total: string | number
  status: "PENDING" | "PAID" | "FREE" | "DEBT" | "CANCELED"
  createdAt: string
  payments: Array<{
    id: string
    amount: string | number
    method: "CASH" | "PIX" | "CARD" | "BANK_TRANSFER" | "OTHER"
    paidAt: string
  }>
  items: Array<{
    id: string
    quantity: string | number
    priceUnit: string | number
    priceTotal: string | number
    product: { name: string }
  }>
}

export type DebtorStatement = {
  debtor: { id: string; name: string; phone: string | null }
  sales: DebtorStatementSale[]
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
    debtorId?: string
  }) {
    const { data } = await http.get<PaginatedDebtReports>("/reports/debts", {
      params,
    })
    return data
  },
  async debtorStatement(debtorId: string) {
    const { data } = await http.get<DebtorStatement>(
      `/reports/debtors/${debtorId}/statement`
    )
    return data
  },
  async receiveDebtPayment(
    debtorId: string,
    input: {
      amount: number
      method: "CASH" | "PIX" | "CARD" | "BANK_TRANSFER" | "OTHER"
      obs?: string
    }
  ) {
    const { data } = await http.post(
      `/reports/debtors/${debtorId}/receive`,
      input
    )
    return data
  },
}
