import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  reportsService,
  type DashboardSummaryParams,
} from "@/services/reports.service"
import type { SalePaymentInput } from "@/services/sales.service"
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
  debtorId?: string
}) {
  return useQuery({
    queryKey: ["reports", "debts", params],
    queryFn: () => reportsService.debts(params),
  })
}

export function useDebtorStatement(debtorId: string | undefined) {
  return useQuery({
    queryKey: ["reports", "debtor-statement", debtorId],
    queryFn: () => reportsService.debtorStatement(debtorId as string),
    enabled: Boolean(debtorId),
  })
}

export function useRegisterDebtPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      debtorId,
      input,
    }: {
      debtorId: string
      input: SalePaymentInput
    }) => reportsService.receiveDebtPayment(debtorId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] })
      queryClient.invalidateQueries({ queryKey: ["sales"] })
      notify.success("Pagamento registrado com sucesso.")
    },
  })
}
