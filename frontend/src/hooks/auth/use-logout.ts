import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import { clearSession, getRefreshToken } from "@/lib/auth"
import { authService } from "@/services/auth.service"

export function useLogout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const refreshToken = getRefreshToken()

      if (refreshToken) {
        await authService.logout(refreshToken)
      }
    },
    onSettled: async () => {
      clearSession()
      queryClient.clear()
      await navigate({ to: "/" })
    },
  })
}
