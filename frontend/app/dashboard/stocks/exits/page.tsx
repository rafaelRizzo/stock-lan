"use client"

import { useState } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { Plus, Trash2, X, ChevronDown, ChevronUp, CreditCard, Clock, CheckCircle } from "lucide-react"

import { useStockExits, type StockExitForm, type StockExit } from "@/app/hooks/useStockExits"
import { useProducts } from "@/app/hooks/useProducts"
import { ProductCombobox } from "@/components/product-combobox"
import { DateTimePicker } from "@/components/date-time-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

const fmt = (v: string | number) =>
    Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })


export default function StockExitsPage() {
    const { exits, loading, filter, setFilter, createExit, markAsPaid, deleteExit } = useStockExits()
    const { products } = useProducts()
    const [open, setOpen] = useState(false)
    const [expanded, setExpanded] = useState<string | null>(null)

    const {
        register,
        handleSubmit,
        reset,
        control,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<StockExitForm>({
        defaultValues: {
            exit_date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
            payment_status: "paid",
            paid_at: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
            items: [{ product_id: "", quantity: 1, unit_price: 0 }],
        },
    })

    const paymentStatus = watch("payment_status")

    const { fields, append, remove } = useFieldArray({ control, name: "items" })

    const openCreate = () => {
        reset({
            reason: "",
            destination: "",
            notes: "",
            exit_date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
            payment_status: "paid",
            paid_at: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
            items: [{ product_id: "", quantity: 1, unit_price: 0 }],
        })
        setOpen(true)
    }

    const onSubmit = handleSubmit(async (data) => {
        const payload: StockExitForm = {
            ...data,
            reason: data.reason?.trim() || undefined,
            destination: data.destination?.trim() || undefined,
            notes: data.notes?.trim() || undefined,
            exit_date: new Date(data.exit_date).toISOString(),
            paid_at: data.payment_status === "paid" ? new Date(data.paid_at!).toISOString() : undefined,
            items: data.items.map((item) => ({
                ...item,
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price),
            })),
        }
        const ok = await createExit(payload)
        if (ok) {
            reset()
            setOpen(false)
        }
    })

    const productName = (id: string) => products.find((p) => p.id === id)?.name ?? "—"

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Vendas</h1>
                <Button size="sm" onClick={openCreate}>
                    <Plus className="h-4 w-4" />
                    Nova Venda
                </Button>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Nova Venda</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={onSubmit} className="flex flex-col gap-4 mt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <Label htmlFor="reason">Motivo</Label>
                                <Input id="reason" placeholder="Ex: Venda balcão" {...register("reason")} />
                            </div>

                            <div className="flex flex-col gap-1">
                                <Label htmlFor="destination">Destino</Label>
                                <Input id="destination" placeholder="Ex: Cliente João Silva" {...register("destination")} />
                            </div>

                            <div className="flex flex-col gap-1">
                                <Label>Data da Venda *</Label>
                                <Controller
                                    name="exit_date"
                                    control={control}
                                    rules={{ required: "Data obrigatória" }}
                                    render={({ field }) => (
                                        <DateTimePicker
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                />
                                {errors.exit_date && <span className="text-xs text-red-500">{errors.exit_date.message}</span>}
                            </div>

                            <div className="flex flex-col gap-1">
                                <Label htmlFor="notes">Observações</Label>
                                <Input id="notes" placeholder="Opcional" {...register("notes")} />
                            </div>

                            <div className="flex flex-col gap-1 col-span-2">
                                <Label>Pagamento *</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={paymentStatus === "paid" ? "default" : "outline"}
                                        onClick={() => {
                                            setValue("payment_status", "paid")
                                            setValue("paid_at", new Date().toISOString().slice(0, 16))
                                        }}
                                    >
                                        <CreditCard className="h-4 w-4" />
                                        À vista
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={paymentStatus === "pending" ? "default" : "outline"}
                                        onClick={() => setValue("payment_status", "pending")}
                                    >
                                        <Clock className="h-4 w-4" />
                                        A prazo / Marcar
                                    </Button>
                                </div>
                            </div>

                            {paymentStatus === "paid" && (
                                <div className="flex flex-col gap-1 col-span-2">
                                    <Label>Data do Pagamento *</Label>
                                    <Controller
                                        name="paid_at"
                                        control={control}
                                        render={({ field }) => (
                                            <DateTimePicker
                                                value={field.value ?? ""}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    />
                                </div>
                            )}
                        </div>

                        <Separator />

                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Itens *</span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ product_id: "", quantity: 1, unit_price: 0 })}
                                >
                                    <Plus className="h-4 w-4" />
                                    Adicionar item
                                </Button>
                            </div>

                            {fields.map((field, index) => (
                                <div key={field.id} className="flex flex-col gap-2 rounded-md border p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">Item {index + 1}</span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-red-500"
                                            disabled={fields.length === 1}
                                            onClick={() => remove(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <Label>Produto *</Label>
                                        <Controller
                                            name={`items.${index}.product_id`}
                                            control={control}
                                            rules={{ required: "Obrigatório" }}
                                            render={({ field: f }) => (
                                                <ProductCombobox
                                                    value={f.value}
                                                    onChange={f.onChange}
                                                    products={products}
                                                    onSelect={(product) =>
                                                        setValue(`items.${index}.unit_price`, Number(product.sale_price))
                                                    }
                                                />
                                            )}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col gap-1">
                                            <Label>Qtd *</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                placeholder="0"
                                                {...register(`items.${index}.quantity`, { required: true })}
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <Label>Preço unit. *</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min={0}
                                                placeholder="0,00"
                                                {...register(`items.${index}.unit_price`, { required: true })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <DialogFooter>
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

            <Input
                placeholder="Filtrar por motivo ou destino..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="max-w-sm"
            />

            {loading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-lg border bg-neutral-50 dark:bg-card p-4 flex flex-col gap-3">
                            <div className="flex justify-between">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-4 w-24" />
                            <div className="flex gap-2 pt-1">
                                <Skeleton className="h-8 w-24" />
                                <Skeleton className="h-8 w-20" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : exits.length === 0 ? (
                <div className="rounded-md border bg-neutral-50 dark:bg-card py-10 text-center text-sm text-muted-foreground">
                    Nenhuma venda encontrada
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {exits.map((exit) => (
                        <div key={exit.id} className="rounded-lg border bg-neutral-50 dark:bg-card p-4 flex flex-col gap-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-col gap-0.5">
                                    <span className="font-medium text-sm">{exit.reason ?? "—"}</span>
                                    <span className="text-xs text-muted-foreground">{exit.destination ?? "—"}</span>
                                </div>
                                <Badge variant={exit.payment_status === "paid" ? "default" : "secondary"} className="shrink-0">
                                    {exit.payment_status === "paid" ? "Pago" : "Pendente"}
                                </Badge>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Total</span>
                                <span className="font-semibold">{fmt(exit.total_value)}</span>
                            </div>

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{new Date(exit.exit_date).toLocaleString("pt-BR")}</span>
                                <button
                                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                                    onClick={() => setExpanded(expanded === exit.id ? null : exit.id)}
                                >
                                    {expanded === exit.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                    {exit.items.length} {exit.items.length === 1 ? "item" : "itens"}
                                </button>
                            </div>

                            {expanded === exit.id && (
                                <div className="rounded-md bg-muted/40 p-3 flex flex-col gap-1.5">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Itens</span>
                                    {exit.items.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between text-xs">
                                            <span className="text-foreground">{productName(item.product_id)}</span>
                                            <span className="text-muted-foreground">
                                                {Number(item.quantity).toLocaleString("pt-BR")} × {fmt(item.unit_price)} = <strong>{fmt(item.total_price)}</strong>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-2 pt-1">
                                {exit.payment_status === "pending" && (
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="flex-1 text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950">
                                                <CheckCircle className="h-4 w-4" />
                                                Confirmar pagamento
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Confirmar pagamento</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Marcar a venda de <strong>{exit.destination ?? "—"}</strong> no valor de <strong>{fmt(exit.total_value)}</strong> como paga?
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction className="bg-green-600 hover:bg-green-700" onClick={() => markAsPaid(exit.id)}>
                                                    Confirmar
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                )}
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm" className={exit.payment_status === "pending" ? "" : "w-full"}>
                                            <Trash2 className="h-4 w-4" />
                                            Deletar
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Deletar esta venda? Esta ação não pode ser desfeita.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteExit(exit.id)}>
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
        </div>
    )
}
