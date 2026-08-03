import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  reportsService,
  type DashboardSummaryParams,
} from "@/services/reports.service"
import { salesService, type SalePaymentInput } from "@/services/sales.service"
import { notify } from "@/lib/toast"

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

export function useDebtReports(params: {
  page: number
  limit: number
  dateFrom?: string
  dateTo?: string
}) {
  return useQuery({
    queryKey: ["reports", "debts", params],
    queryFn: () => reportsService.debts(params),
  })
}

export function useRegisterDebtPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SalePaymentInput }) =>
      salesService.addPayment(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] })
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      notify.success("Pagamento registrado com sucesso.")
    },
  })
}
