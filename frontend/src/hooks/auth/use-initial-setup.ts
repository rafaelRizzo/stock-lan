import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import { saveSession } from "@/lib/auth"
import { authService, type SetupCredentials } from "@/services/auth.service"

export function useInitialSetup() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mutation = useMutation({ mutationFn: authService.setup })

  async function setup(credentials: SetupCredentials) {
    const session = await mutation.mutateAsync(credentials)

    saveSession(session)
    queryClient.setQueryData(["auth", "setup-status"], { needsSetup: false })
    await navigate({ to: "/dashboard" })
  }

  return { ...mutation, setup }
}
