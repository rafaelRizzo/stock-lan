import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  productionService,
  type CreateProductionOrderInput,
  type ProductionOrdersParams,
} from "@/services/production.service"
import { notify } from "@/lib/toast"

export function useProductionOrders(params: ProductionOrdersParams) {
  return useQuery({
    queryKey: ["production", "orders", params],
    queryFn: () => productionService.listOrders(params),
  })
}

function invalidateAfterMutation(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["production"] })
  queryClient.invalidateQueries({ queryKey: ["stock"] })
  queryClient.invalidateQueries({ queryKey: ["dashboard"] })
}

export function useCreateProductionOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProductionOrderInput) =>
      productionService.createOrder(input),
    onSuccess: () => {
      invalidateAfterMutation(queryClient)
      notify.success("Ordem de produção criada com sucesso.")
    },
  })
}

export function useUpdateProductionOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: CreateProductionOrderInput
    }) => productionService.updateOrder(id, input),
    onSuccess: () => {
      invalidateAfterMutation(queryClient)
      notify.success("Ordem de produção atualizada com sucesso.")
    },
  })
}

export function useCancelProductionOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => productionService.cancelOrder(id),
    onSuccess: () => {
      invalidateAfterMutation(queryClient)
      notify.success("Ordem de produção cancelada com sucesso.")
    },
  })
}
