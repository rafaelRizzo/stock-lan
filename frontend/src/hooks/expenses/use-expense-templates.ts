import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  expenseTemplatesService,
  type ExpenseTemplateInput,
  type ExpenseTemplatesParams,
} from "@/services/expense-templates.service"
import { notify } from "@/lib/toast"

export function useExpenseTemplates() {
  return useQuery({
    queryKey: ["expense-templates", "active"],
    queryFn: () => expenseTemplatesService.list(),
  })
}

export function useAllExpenseTemplates(
  params: ExpenseTemplatesParams = {
    page: 1,
    limit: 100,
    includeArchived: true,
  }
) {
  return useQuery({
    queryKey: ["expense-templates", "all", params],
    queryFn: () => expenseTemplatesService.list(params),
  })
}

function useTemplateMutation<T>(
  mutationFn: (input: T) => Promise<unknown>,
  message: string
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-templates"] })
      notify.success(message)
    },
  })
}
export function useCreateExpenseTemplate() {
  return useTemplateMutation(
    (input: ExpenseTemplateInput) => expenseTemplatesService.create(input),
    "Modelo de despesa criado com sucesso."
  )
}
export function useUpdateExpenseTemplate() {
  return useTemplateMutation(
    ({ id, input }: { id: string; input: Partial<ExpenseTemplateInput> }) =>
      expenseTemplatesService.update(id, input),
    "Modelo de despesa atualizado com sucesso."
  )
}
export function useArchiveExpenseTemplate() {
  return useTemplateMutation(
    (id: string) => expenseTemplatesService.archive(id),
    "Modelo de despesa arquivado com sucesso."
  )
}
export function useRestoreExpenseTemplate() {
  return useTemplateMutation(
    (id: string) => expenseTemplatesService.restore(id),
    "Modelo de despesa restaurado com sucesso."
  )
}
export function useDeleteExpenseTemplate() {
  return useTemplateMutation(
    (id: string) => expenseTemplatesService.delete(id),
    "Modelo de despesa excluído com sucesso."
  )
}
