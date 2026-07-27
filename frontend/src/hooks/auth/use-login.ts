import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import { saveSession } from "@/lib/auth"
import { authService, type LoginCredentials } from "@/services/auth.service"

export function useLogin() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mutation = useMutation({ mutationFn: authService.login })

  async function login(credentials: LoginCredentials) {
    const session = await mutation.mutateAsync(credentials)

    saveSession(session)
    await queryClient.invalidateQueries({ queryKey: ["auth", "me"] })
    await navigate({ to: "/dashboard" })
  }

  return { ...mutation, login }
}
