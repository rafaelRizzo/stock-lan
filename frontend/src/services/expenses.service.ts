import { http } from "@/lib/http"

export type ExpenseStatus = "PENDING" | "PAID" | "CANCELED"
export type Expense = {
  id: string
  name: string
  value: string | number
  dueDate: string
  paidAt: string | null
  status: ExpenseStatus
  obs: string | null
  createdAt: string
  expenseTemplate: {
    id: string
    name: string
    recurrence: "ONE_TIME" | "WEEKLY" | "MONTHLY" | "YEARLY"
  } | null
}
export type ExpensesParams = {
  page: number
  limit: number
  search?: string
  status?: ExpenseStatus
}
export type PaginatedExpenses = {
  data: Expense[]
  total: number
  totalPage: number
  page: number
  limit: number
}
export type ExpenseInput = {
  expenseTemplateId?: string
  name: string
  value: number
  dueDate: Date
  paidAt?: Date
  status: ExpenseStatus
  obs?: string
}

export const expensesService = {
  async list(params: ExpensesParams) {
    const { data } = await http.get<PaginatedExpenses>("/expenses", { params })
    return data
  },
  async create(input: ExpenseInput) {
    const { data } = await http.post<Expense>("/expenses", input)
    return data
  },
  async update(id: string, input: Partial<ExpenseInput>) {
    const { data } = await http.patch<Expense>(`/expenses/${id}`, input)
    return data
  },
  async delete(id: string) {
    await http.delete(`/expenses/${id}`)
  },
}
