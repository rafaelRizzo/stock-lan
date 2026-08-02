import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  salesService,
  type CreateSaleInput,
  type SalesParams,
} from "@/services/sales.service"
import { notify } from "@/lib/toast"

export function useSales(params: SalesParams) {
  return useQuery({
    queryKey: ["sales", params],
    queryFn: () => salesService.list(params),
  })
}

export function useCreateSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateSaleInput) => salesService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      queryClient.invalidateQueries({ queryKey: ["stock"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      notify.success("Venda registrada com sucesso.")
    },
  })
}

export function useUpdateSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateSaleInput }) =>
      salesService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      queryClient.invalidateQueries({ queryKey: ["stock"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      notify.success("Venda atualizada com sucesso.")
    },
  })
}

export function useDeleteSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => salesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      queryClient.invalidateQueries({ queryKey: ["stock"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      notify.success("Venda excluída com sucesso.")
    },
  })
}
