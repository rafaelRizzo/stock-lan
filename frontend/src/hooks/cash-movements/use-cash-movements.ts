import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  cashMovementsService,
  type CashMovementInput,
  type CashMovementsParams,
} from "@/services/cash-movements.service"
import { notify } from "@/lib/toast"

export function useCashMovements(params: CashMovementsParams) {
  return useQuery({
    queryKey: ["cash-movements", params],
    queryFn: () => cashMovementsService.list(params),
  })
}

export function useCashBalance() {
  return useQuery({
    queryKey: ["cash-movements", "balance"],
    queryFn: () => cashMovementsService.balance(),
  })
}

function useCashMovementMutation<T>(
  mutationFn: (input: T) => Promise<unknown>,
  message: string
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-movements"] })
      queryClient.invalidateQueries({ queryKey: ["reports"] })
      notify.success(message)
    },
  })
}

export function useCreateCashMovement() {
  return useCashMovementMutation(
    (input: CashMovementInput) => cashMovementsService.create(input),
    "Movimentação registrada com sucesso."
  )
}

export function useDeleteCashMovement() {
  return useCashMovementMutation(
    (id: string) => cashMovementsService.delete(id),
    "Movimentação excluída com sucesso."
  )
}
