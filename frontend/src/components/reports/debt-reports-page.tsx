import { useEffect, useState, type FormEvent } from "react"
import {
  ChevronLeft,
  ChevronRight,
  HandCoins,
  LoaderCircle,
  WalletCards,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useDebtReports,
  useRegisterDebtPayment,
} from "@/hooks/reports/use-dashboard-summary"
import { getApiErrorMessage } from "@/lib/http"
import type { DebtReport } from "@/services/reports.service"
import type { PaymentMethod } from "@/services/sales.service"

const pageSize = 20

const paymentMethods: Record<PaymentMethod, string> = {
  CASH: "Dinheiro",
  PIX: "PIX",
  CARD: "Cartão",
  BANK_TRANSFER: "Transferência",
  OTHER: "Outro",
}

export function DebtReportsPage() {
  const [page, setPage] = useState(1)
  const [paymentTarget, setPaymentTarget] = useState<DebtReport | null>(null)
  const debts = useDebtReports({ page, limit: pageSize })
  const totalOutstanding = debts.data?.data.reduce(
    (total, debt) => total + balanceOf(debt),
    0
  )

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <HandCoins className="size-4" /> Financeiro
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
            Contas a receber
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Vendas fiadas e seus pagamentos pendentes.
          </p>
        </div>
        <div className="rounded-2xl bg-[#eaf4ec] px-4 py-3 dark:bg-emerald-950">
          <p className="text-xs font-medium text-[#2e7152] dark:text-emerald-300">
            Total pendente
          </p>
          <p className="mt-1 text-lg font-semibold text-[#2e7152] dark:text-emerald-300">
            {formatCurrency(totalOutstanding ?? 0)}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#e5e9e4] bg-background dark:border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Cliente</TableHead>
              <TableHead className="hidden md:table-cell">Venda</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="hidden text-right sm:table-cell">
                Recebido
              </TableHead>
              <TableHead className="text-right">Saldo</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {debts.isLoading && <LoadingRows />}
            {!debts.isLoading &&
              debts.data?.data.map((debt) => (
                <DebtRow
                  debt={debt}
                  key={debt.id}
                  onReceive={() => setPaymentTarget(debt)}
                />
              ))}
            {!debts.isLoading && debts.data?.data.length === 0 && (
              <TableRow>
                <TableCell
                  className="h-52 text-center text-muted-foreground"
                  colSpan={6}
                >
                  Nenhuma conta a receber.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-[#e5e9e4] p-4 text-sm dark:border-border">
          <span className="text-muted-foreground">
            {debts.data?.total ?? 0} conta{debts.data?.total === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              aria-label="Página anterior"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              size="icon-sm"
              variant="outline"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Página {page} de {debts.data?.totalPage ?? 1}
            </span>
            <Button
              aria-label="Próxima página"
              disabled={!debts.data || page >= debts.data.totalPage}
              onClick={() => setPage((current) => current + 1)}
              size="icon-sm"
              variant="outline"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      <ReceivePaymentDialog
        debt={paymentTarget}
        onClose={() => setPaymentTarget(null)}
      />
    </div>
  )
}

function DebtRow({
  debt,
  onReceive,
}: {
  debt: DebtReport
  onReceive: () => void
}) {
  const paid = paidOf(debt)
  const balance = balanceOf(debt)

  return (
    <TableRow>
      <TableCell className="py-3 pl-5">
        <div>
          <p className="font-medium">
            {debt.debtor?.name ?? debt.clientName ?? "Cliente não informado"}
          </p>
          <p className="text-xs text-muted-foreground md:hidden">
            {formatDate(debt.createdAt)}
          </p>
        </div>
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        {formatDate(debt.createdAt)}
      </TableCell>
      <TableCell className="text-right">{formatCurrency(debt.total)}</TableCell>
      <TableCell className="hidden text-right text-[#2e7152] sm:table-cell dark:text-emerald-300">
        {formatCurrency(paid)}
      </TableCell>
      <TableCell className="text-right font-semibold text-[#b84c5d] dark:text-rose-300">
        {formatCurrency(balance)}
      </TableCell>
      <TableCell>
        <Button
          className="rounded-xl"
          onClick={onReceive}
          size="sm"
          variant="outline"
        >
          <WalletCards className="size-4" /> Receber
        </Button>
      </TableCell>
    </TableRow>
  )
}

function ReceivePaymentDialog({
  debt,
  onClose,
}: {
  debt: DebtReport | null
  onClose: () => void
}) {
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<PaymentMethod>("PIX")
  const [error, setError] = useState<string | null>(null)
  const registerPayment = useRegisterDebtPayment()
  const balance = debt ? balanceOf(debt) : 0

  useEffect(() => {
    if (debt) setAmount(String(balance).replace(".", ","))
    setMethod("PIX")
    setError(null)
  }, [debt, balance])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!debt) return
    const parsedAmount = Number(amount.replace(",", "."))
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0)
      return setError("Informe um valor válido.")
    if (parsedAmount > balance) return setError("O valor excede o saldo.")

    try {
      setError(null)
      await registerPayment.mutateAsync({
        id: debt.id,
        input: { amount: parsedAmount, method },
      })
      onClose()
    } catch (cause) {
      setError(getApiErrorMessage(cause))
    }
  }

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={Boolean(debt)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Receber pagamento</DialogTitle>
          <DialogDescription>
            {debt?.debtor?.name ?? debt?.clientName ?? "Cliente"}, saldo de{" "}
            {formatCurrency(balance)}.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-medium">
            Valor recebido
            <Input
              className="h-10 rounded-xl"
              inputMode="decimal"
              onChange={(event) =>
                setAmount(
                  event.target.value
                    .replace(/[^0-9,]/g, "")
                    .replace(/(,.*),/g, "$1")
                )
              }
              value={amount}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Forma de pagamento
            <Select
              onValueChange={(value) => setMethod(value as PaymentMethod)}
              value={method}
            >
              <SelectTrigger className="h-10! rounded-xl!">
                <span>{paymentMethods[method]}</span>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(paymentMethods).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          {error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button onClick={onClose} type="button" variant="outline">
              Cancelar
            </Button>
            <Button
              className="bg-[#173f31] text-white hover:bg-[#245742]"
              disabled={registerPayment.isPending}
              type="submit"
            >
              {registerPayment.isPending && (
                <LoaderCircle className="size-4 animate-spin" />
              )}
              Confirmar recebimento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function LoadingRows() {
  return Array.from({ length: 5 }).map((_, index) => (
    <TableRow key={index}>
      <TableCell colSpan={6}>
        <span className="block h-4 animate-pulse rounded bg-muted" />
      </TableCell>
    </TableRow>
  ))
}

function paidOf(debt: DebtReport) {
  return debt.payments.reduce(
    (total, payment) => total + Number(payment.amount),
    0
  )
}

function balanceOf(debt: DebtReport) {
  return Math.max(0, Number(debt.total) - paidOf(debt))
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value) || 0)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
    new Date(value)
  )
}
