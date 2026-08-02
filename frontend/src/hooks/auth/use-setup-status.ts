import { useQuery } from "@tanstack/react-query"

import { authService } from "@/services/auth.service"

export function useSetupStatus() {
  return useQuery({
    queryKey: ["auth", "setup-status"],
    queryFn: authService.getSetupStatus,
    staleTime: Infinity,
    retry: false,
  })
}
