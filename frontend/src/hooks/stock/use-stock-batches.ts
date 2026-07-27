import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  stockService,
  type CreateStockBatchInput,
  type StockBatchesParams,
} from "@/services/stock.service"
import { notify } from "@/lib/toast"

export function useStockBatches(params: StockBatchesParams) {
  return useQuery({
    queryKey: ["stock", "batches", params],
    queryFn: () => stockService.listBatches(params),
  })
}

export function useStockMovements(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: ["stock", "movements", params],
    queryFn: () => stockService.listMovements(params),
  })
}

export function useStockAlerts(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: ["stock", "alerts", params],
    queryFn: () => stockService.listAlerts(params),
  })
}

export function useCreateStockBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateStockBatchInput) =>
      stockService.createBatch(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      notify.success("Entrada registrada com sucesso.")
    },
  })
}

export function useUpdateStockBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateStockBatchInput }) =>
      stockService.updateBatch(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      notify.success("Entrada atualizada com sucesso.")
    },
  })
}

export function useDeleteStockBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => stockService.deleteBatch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      notify.success("Entrada excluída com sucesso.")
    },
  })
}
