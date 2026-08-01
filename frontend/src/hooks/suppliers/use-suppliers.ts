import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  suppliersService,
  type SupplierInput,
  type SuppliersParams,
} from "@/services/suppliers.service"
import { notify } from "@/lib/toast"

export function useSuppliers(params: SuppliersParams) {
  return useQuery({
    queryKey: ["suppliers", params],
    queryFn: () => suppliersService.list(params),
  })
}
export function useCreateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SupplierInput) => suppliersService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      notify.success("Fornecedor criado com sucesso.")
    },
  })
}
export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: Partial<SupplierInput>
    }) => suppliersService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      notify.success("Fornecedor atualizado com sucesso.")
    },
  })
}
export function useArchiveSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => suppliersService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      notify.success("Fornecedor arquivado com sucesso.")
    },
  })
}

export function useRestoreSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => suppliersService.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      notify.success("Fornecedor restaurado com sucesso.")
    },
  })
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => suppliersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] })
      notify.success("Fornecedor excluído com sucesso.")
    },
  })
}
