import { useQuery } from "@tanstack/react-query"

import {
  reportsService,
  type DashboardSummaryParams,
} from "@/services/reports.service"

export function useDashboardSummary(
  enabled: boolean,
  params?: DashboardSummaryParams
) {
  return useQuery({
    queryKey: ["reports", "dashboard", params],
    queryFn: () => reportsService.dashboard(params),
    enabled,
    staleTime: 30 * 1000,
  })
}
