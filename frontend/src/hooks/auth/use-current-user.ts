import { useQuery } from "@tanstack/react-query"

import { hasSession } from "@/lib/auth"
import { authService } from "@/services/auth.service"

export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: authService.me,
    enabled: hasSession(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}
