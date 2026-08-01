import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  quantityTypesService,
  type QuantityTypesParams,
} from "@/services/quantity-types.service"
import { notify } from "@/lib/toast"

export function useQuantityTypes(params: QuantityTypesParams) {
  return useQuery({
    queryKey: ["quantity-types", params],
    queryFn: () => quantityTypesService.list(params),
  })
}
export function useCreateQuantityType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => quantityTypesService.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quantity-types"] })
      notify.success("Tipo de quantidade criado com sucesso.")
    },
  })
}

export function useUpdateQuantityType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      quantityTypesService.update(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quantity-types"] })
      notify.success("Tipo de quantidade atualizado com sucesso.")
    },
  })
}
export function useArchiveQuantityType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => quantityTypesService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quantity-types"] })
      notify.success("Tipo de quantidade arquivado com sucesso.")
    },
  })
}

export function useRestoreQuantityType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => quantityTypesService.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quantity-types"] })
      notify.success("Tipo de quantidade restaurado com sucesso.")
    },
  })
}

export function useDeleteQuantityType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => quantityTypesService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quantity-types"] })
      notify.success("Tipo de quantidade excluído com sucesso.")
    },
  })
}
