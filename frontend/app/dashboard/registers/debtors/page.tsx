"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { Plus, Trash2, Pencil, Search, Phone, FileText, AlertCircle, CheckCircle2, User } from "lucide-react"

import { useDebtors, type Debtor, type DebtorForm, type DebtorSummary } from "@/app/hooks/useDebtors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"

const fmt = (v: string | number) =>
    Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const today = () => new Date().toISOString().slice(0, 10)
const firstOfMonth = () => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function DebtorAvatar({ name }: { name: string }) {
    const initials = name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
    return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
            {initials}
        </div>
    )
}

export default function DebtorsPage() {
    const { debtors, loading, filter, setFilter, createDebtor, updateDebtor, deleteDebtor, getDebtorSummary } = useDebtors()
    const [open, setOpen] = useState(false)
    const [editing, setEditing] = useState<Debtor | null>(null)
    const [summaryOpen, setSummaryOpen] = useState(false)
    const [summaryDebtor, setSummaryDebtor] = useState<Debtor | null>(null)
    const [summary, setSummary] = useState<DebtorSummary | null>(null)
    const [summaryLoading, setSummaryLoading] = useState(false)
    const [startDate, setStartDate] = useState(firstOfMonth())
    const [endDate, setEndDate] = useState(today())

    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<DebtorForm>()

    const openCreate = () => {
        setEditing(null)
        reset({ name: "", phone: "", notes: "" })
        setOpen(true)
    }

    const openEdit = (debtor: Debtor) => {
        setEditing(debtor)
        reset({ name: debtor.name, phone: debtor.phone ?? "", notes: debtor.notes ?? "" })
        setOpen(true)
    }

    const openSummary = async (debtor: Debtor) => {
        setSummaryDebtor(debtor)
        setSummary(null)
        setSummaryOpen(true)
        setSummaryLoading(true)
        const result = await getDebtorSummary(debtor.id, startDate, endDate)
        setSummary(result)
        setSummaryLoading(false)
    }

    const fetchSummary = async () => {
        if (!summaryDebtor) return
        setSummaryLoading(true)
        setSummary(null)
        const result = await getDebtorSummary(summaryDebtor.id, startDate, endDate)
        setSummary(result)
        setSummaryLoading(false)
    }

    const onSubmit = handleSubmit(async (data) => {
        const form: DebtorForm = {
            name: data.name.trim(),
            phone: data.phone?.trim() || undefined,
            notes: data.notes?.trim() || undefined,
        }
        const ok = editing ? await updateDebtor(editing.id, form) : await createDebtor(form)
        if (ok) { reset(); setOpen(false); setEditing(null) }
    })

    const totalDebt = debtors.reduce((s, d) => s + Number(d.total_debt), 0)
    const withDebt = debtors.filter(d => Number(d.total_debt) > 0).length

    return (
        <div className="flex flex-col gap-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">Devedores</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Gerencie clientes com vendas a prazo</p>
                </div>
                <Button size="sm" onClick={openCreate}>
                    <Plus className="h-4 w-4" />
                    Novo Devedor
                </Button>
            </div>

            {/* Stats */}
            {!loading && debtors.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border bg-card p-4">
                        <p className="text-xs text-muted-foreground">Total cadastrados</p>
                        <p className="text-2xl font-bold mt-1">{debtors.length}</p>
                    </div>
                    <div className="rounded-xl border bg-card p-4">
                        <p className="text-xs text-muted-foreground">Com dívida ativa</p>
                        <p className={`text-2xl font-bold mt-1 ${withDebt > 0 ? "text-red-500" : ""}`}>{withDebt}</p>
                    </div>
                    <div className="rounded-xl border bg-card p-4">
                        <p className="text-xs text-muted-foreground">Dívida total</p>
                        <p className={`text-2xl font-bold mt-1 ${totalDebt > 0 ? "text-red-500" : "text-green-600"}`}>{fmt(totalDebt)}</p>
                    </div>
                </div>
            )}

            <Input
                placeholder="Filtrar por nome ou telefone..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="max-w-xs"
            />

            {/* Cards grid */}
            {loading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-xl border bg-card p-4 flex flex-col gap-3">
                            <div className="flex gap-3 items-center">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="flex flex-col gap-1.5 flex-1">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            </div>
                            <Skeleton className="h-8 w-full" />
                            <div className="flex gap-2">
                                <Skeleton className="h-8 flex-1" />
                                <Skeleton className="h-8 flex-1" />
                                <Skeleton className="h-8 w-8" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : debtors.length === 0 ? (
                <div className="rounded-xl border bg-card py-16 flex flex-col items-center gap-2 text-muted-foreground">
                    <User className="h-8 w-8 opacity-30" />
                    <span className="text-sm">Nenhum devedor encontrado</span>
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {debtors.map((debtor) => (
                        <div key={debtor.id} className="rounded-xl border bg-card p-4 flex flex-col gap-3 justify-between">
                            {/* Top */}
                            <div className="flex items-start gap-3">
                                <DebtorAvatar name={debtor.name} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-sm truncate">{debtor.name}</p>
                                        {Number(debtor.total_debt) > 0 && (
                                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">Deve</Badge>
                                        )}
                                    </div>
                                    {debtor.phone && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                            <Phone className="h-3 w-3" />{debtor.phone}
                                        </p>
                                    )}
                                    {debtor.notes && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                                            <FileText className="h-3 w-3 shrink-0" />{debtor.notes}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* Debt info */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Dívida</span>
                                    <span className={`text-sm font-bold ${Number(debtor.total_debt) > 0 ? "text-red-500" : "text-green-600"}`}>
                                        {fmt(debtor.total_debt)}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Vendas</span>
                                    <span className="text-sm font-bold">{debtor.total_exits}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-1 mt-auto">
                                <Button variant="outline" size="sm" className="flex-1" onClick={() => openSummary(debtor)}>
                                    <Search className="h-3.5 w-3.5" />
                                    Resumo
                                </Button>
                                <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(debtor)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                    Editar
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                            <AlertDialogDescription asChild>
                                                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                                                    <p>Você está prestes a deletar <strong className="text-foreground">{debtor.name}</strong> e todas as suas dívidas vinculadas.</p>
                                                    <p className="rounded-md bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 px-3 py-2 text-xs">
                                                        Para dar baixa em uma dívida, vá em <strong>Vendas</strong>, localize a venda do devedor e confirme o pagamento manualmente. Só delete o devedor após quitar todas as pendências.
                                                    </p>
                                                </div>
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteDebtor(debtor.id)}>
                                                Deletar
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Form dialog */}
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? "Editar Devedor" : "Novo Devedor"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={onSubmit} className="flex flex-col gap-3 mt-2">
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="name">Nome *</Label>
                            <Input id="name" placeholder="Ex: João da Silva" {...register("name", { required: "Nome obrigatório" })} />
                            {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="phone">Telefone</Label>
                            <Input id="phone" placeholder="Ex: 11999990000" {...register("phone")} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="notes">Observações</Label>
                            <Input id="notes" placeholder="Ex: Cliente antigo" {...register("notes")} />
                        </div>
                        <DialogFooter className="mt-2">
                            <DialogClose asChild>
                                <Button type="button" variant="outline" size="sm">Cancelar</Button>
                            </DialogClose>
                            <Button type="submit" size="sm" disabled={isSubmitting}>
                                {isSubmitting ? "Salvando..." : "Salvar"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Summary dialog */}
            <Dialog open={summaryOpen} onOpenChange={(v) => { setSummaryOpen(v); if (!v) { setSummary(null); setSummaryDebtor(null) } }}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            {summaryDebtor && <DebtorAvatar name={summaryDebtor.name} />}
                            <div>
                                <DialogTitle>{summaryDebtor?.name}</DialogTitle>
                                {summaryDebtor?.phone && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <Phone className="h-3 w-3" />{summaryDebtor.phone}
                                    </p>
                                )}
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Date filter */}
                    <div className="flex gap-2 items-end mt-1">
                        <div className="flex flex-col gap-1 flex-1">
                            <Label className="text-xs">Data inicial</Label>
                            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-xs h-8" />
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                            <Label className="text-xs">Data final</Label>
                            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-xs h-8" />
                        </div>
                        <Button size="sm" className="h-8" onClick={fetchSummary} disabled={summaryLoading}>
                            <Search className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    {summaryLoading ? (
                        <div className="flex flex-col gap-2 mt-2">
                            <div className="grid grid-cols-3 gap-2">
                                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
                            </div>
                            <Skeleton className="h-20 rounded-xl" />
                            <Skeleton className="h-20 rounded-xl" />
                        </div>
                    ) : summary ? (
                        <div className="flex flex-col gap-4 mt-1">
                            {/* Summary cards */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-xl border bg-muted/30 p-3">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Saídas</p>
                                    <p className="text-xl font-bold mt-0.5">{summary.summary.total_exits}</p>
                                </div>
                                <div className="rounded-xl border bg-muted/30 p-3">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Dívida</p>
                                    <p className={`text-xl font-bold mt-0.5 ${Number(summary.summary.total_debt) > 0 ? "text-red-500" : "text-green-600"}`}>
                                        {fmt(summary.summary.total_debt)}
                                    </p>
                                </div>
                                <div className="rounded-xl border bg-muted/30 p-3">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pago</p>
                                    <p className="text-xl font-bold mt-0.5 text-green-600">{fmt(summary.summary.total_paid)}</p>
                                </div>
                            </div>

                            {/* Pending */}
                            {summary.pending_exits.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 text-red-500" />
                                        <span className="text-sm font-semibold text-red-500">Pendentes ({summary.pending_exits.length})</span>
                                    </div>
                                    {summary.pending_exits.map((exit) => (
                                        <div key={exit.id} className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-3 flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground">{new Date(exit.exit_date).toLocaleString("pt-BR")}</span>
                                                <span className="font-bold text-sm text-red-500">{fmt(exit.total_value)}</span>
                                            </div>
                                            <Separator className="opacity-50" />
                                            {exit.items.map((item) => (
                                                <div key={item.item_id} className="flex items-center justify-between text-xs">
                                                    <span className="text-foreground">{item.product_name}</span>
                                                    <span className="text-muted-foreground">{Number(item.quantity).toLocaleString("pt-BR")} × {fmt(item.unit_price)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Paid */}
                            {summary.paid_exits.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        <span className="text-sm font-semibold text-green-600">Pagos ({summary.paid_exits.length})</span>
                                    </div>
                                    {summary.paid_exits.map((exit) => (
                                        <div key={exit.id} className="rounded-xl border p-3 flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-muted-foreground">{new Date(exit.exit_date).toLocaleString("pt-BR")}</span>
                                                <span className="font-bold text-sm">{fmt(exit.total_value)}</span>
                                            </div>
                                            <Separator className="opacity-50" />
                                            {exit.items.map((item) => (
                                                <div key={item.item_id} className="flex items-center justify-between text-xs">
                                                    <span className="text-foreground">{item.product_name}</span>
                                                    <span className="text-muted-foreground">{Number(item.quantity).toLocaleString("pt-BR")} × {fmt(item.unit_price)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {summary.pending_exits.length === 0 && summary.paid_exits.length === 0 && (
                                <div className="rounded-xl border bg-muted/30 py-10 flex flex-col items-center gap-2 text-muted-foreground">
                                    <FileText className="h-6 w-6 opacity-40" />
                                    <span className="text-sm">Nenhuma saída no período</span>
                                </div>
                            )}
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    )
}
