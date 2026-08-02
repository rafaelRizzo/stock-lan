import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  productsService,
  type CreateProductInput,
  type ProductsParams,
} from "@/services/products.service"
import { notify } from "@/lib/toast"

export function useProducts(params: ProductsParams) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => productsService.list(params),
  })
}
export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateProductInput) => productsService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      notify.success("Produto criado com sucesso.")
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: Partial<CreateProductInput>
    }) => productsService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      notify.success("Produto atualizado com sucesso.")
    },
  })
}
export function useArchiveProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => productsService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      notify.success("Produto arquivado com sucesso.")
    },
  })
}

export function useRestoreProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => productsService.restore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      notify.success("Produto restaurado com sucesso.")
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => productsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] })
      notify.success("Produto excluído com sucesso.")
    },
  })
}
