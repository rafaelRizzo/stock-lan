import { http } from "@/lib/http"

export type ExpenseRecurrence = "ONE_TIME" | "WEEKLY" | "MONTHLY" | "YEARLY"
export type ExpenseTemplate = {
  id: string
  name: string
  recurrence: ExpenseRecurrence
  defaultValue: string | number
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED"
  obs: string | null
  createdAt: string
}
export type ExpenseTemplateInput = {
  name: string
  recurrence: ExpenseRecurrence
  defaultValue: number
  obs?: string
}
export type PaginatedExpenseTemplates = {
  data: ExpenseTemplate[]
  total: number
  totalPage: number
  page: number
  limit: number
}

export const expenseTemplatesService = {
  async list(
    params: {
      page: number
      limit: number
      status?: "ACTIVE" | "INACTIVE" | "ARCHIVED"
      includeArchived?: boolean
    } = { page: 1, limit: 100, status: "ACTIVE" }
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
  async delete(id: string) {
    await http.delete(`/expense-templates/${id}/permanent`)
  },
}
