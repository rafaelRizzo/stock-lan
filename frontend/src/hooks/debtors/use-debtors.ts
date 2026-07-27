import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  debtorsService,
  type DebtorInput,
  type DebtorsParams,
} from "@/services/debtors.service"
import { notify } from "@/lib/toast"

export function useDebtors(params: DebtorsParams) {
  return useQuery({
    queryKey: ["debtors", params],
    queryFn: () => debtorsService.list(params),
  })
}
export function useCreateDebtor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DebtorInput) => debtorsService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debtors"] })
      notify.success("Devedor criado com sucesso.")
    },
  })
}
export function useUpdateDebtor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<DebtorInput> }) =>
      debtorsService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debtors"] })
      notify.success("Devedor atualizado com sucesso.")
    },
  })
}
export function useArchiveDebtor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => debtorsService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debtors"] })
      notify.success("Devedor arquivado com sucesso.")
    },
  })
}

export function useDeleteDebtor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => debtorsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debtors"] })
      notify.success("Devedor excluído com sucesso.")
    },
  })
}
