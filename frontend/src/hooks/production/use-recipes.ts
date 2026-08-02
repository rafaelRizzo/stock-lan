import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  productionService,
  type RecipeItemInput,
} from "@/services/production.service"
import { notify } from "@/lib/toast"

export function useRecipe(finishedProductId: string | undefined) {
  return useQuery({
    queryKey: ["production", "recipe", finishedProductId],
    queryFn: () => productionService.getRecipe(finishedProductId as string),
    enabled: Boolean(finishedProductId),
  })
}

export function useReplaceRecipe() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      finishedProductId,
      items,
    }: {
      finishedProductId: string
      items: RecipeItemInput[]
    }) => productionService.replaceRecipe(finishedProductId, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production"] })
      notify.success("Receita atualizada com sucesso.")
    },
  })
}
