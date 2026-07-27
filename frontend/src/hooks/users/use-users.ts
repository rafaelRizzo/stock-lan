import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  usersService,
  type CreateUserInput,
  type UsersListParams,
} from "@/services/users.service"
import { notify } from "@/lib/toast"

export function useUsers(params: UsersListParams) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => usersService.list(params),
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateUserInput) => usersService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      notify.success("Usuário criado com sucesso.")
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: Partial<CreateUserInput>
    }) => usersService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      notify.success("Usuário atualizado com sucesso.")
    },
  })
}

export function useArchiveUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => usersService.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      notify.success("Usuário arquivado com sucesso.")
    },
  })
}
