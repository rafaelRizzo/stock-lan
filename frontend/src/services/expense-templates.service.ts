import { http } from "@/lib/http"

export type ExpenseRecurrence = "ONE_TIME" | "WEEKLY" | "MONTHLY" | "YEARLY"
export type ExpenseTemplateStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED"
export type ExpenseTemplate = {
  id: string
  name: string
  recurrence: ExpenseRecurrence
  defaultValue: string | number
  status: ExpenseTemplateStatus
  anchorDate: string | null
  nextDueDate: string | null
  obs: string | null
  createdAt: string
}
export type ExpenseTemplateInput = {
  name: string
  recurrence: ExpenseRecurrence
  defaultValue: number
  anchorDate?: string
  obs?: string
}
export type PaginatedExpenseTemplates = {
  data: ExpenseTemplate[]
  total: number
  totalPage: number
  page: number
  limit: number
}
export type ExpenseTemplatesParams = {
  page: number
  limit: number
  search?: string
  status?: ExpenseTemplateStatus
  includeArchived?: boolean
}

export const expenseTemplatesService = {
  async list(
    params: ExpenseTemplatesParams = { page: 1, limit: 100, status: "ACTIVE" }
  ) {
    const { data } = await http.get<PaginatedExpenseTemplates>(
      "/expense-templates",
      {
        params,
      }
    )
    return data
  },
  async create(input: ExpenseTemplateInput) {
    const { data } = await http.post<ExpenseTemplate>(
      "/expense-templates",
      input
    )
    return data
  },
  async update(id: string, input: Partial<ExpenseTemplateInput>) {
    const { data } = await http.patch<ExpenseTemplate>(
      `/expense-templates/${id}`,
      input
    )
    return data
  },
  async archive(id: string) {
    await http.delete(`/expense-templates/${id}`)
  },
  async restore(id: string) {
    await http.patch(`/expense-templates/${id}/restore`)
  },
  async delete(id: string) {
    await http.delete(`/expense-templates/${id}/permanent`)
  },
}
