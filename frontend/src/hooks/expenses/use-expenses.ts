import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  expensesService,
  type ExpenseInput,
  type ExpensesParams,
} from "@/services/expenses.service"
import { notify } from "@/lib/toast"

export function useExpenses(params: ExpensesParams) {
  return useQuery({
    queryKey: ["expenses", params],
    queryFn: () => expensesService.list(params),
  })
}

function useExpenseMutation<T>(
  mutationFn: (input: T) => Promise<unknown>,
  message: string
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      notify.success(message)
    },
  })
}

export function useCreateExpense() {
  return useExpenseMutation(
    (input: ExpenseInput) => expensesService.create(input),
    "Despesa criada com sucesso."
  )
}

export function useUpdateExpense() {
  return useExpenseMutation(
    ({ id, input }: { id: string; input: Partial<ExpenseInput> }) =>
      expensesService.update(id, input),
    "Despesa atualizada com sucesso."
  )
}

export function useDeleteExpense() {
  return useExpenseMutation(
    (id: string) => expensesService.delete(id),
    "Despesa excluída com sucesso."
  )
}
