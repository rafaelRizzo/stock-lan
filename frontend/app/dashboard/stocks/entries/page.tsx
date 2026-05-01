"use client"

import { useState } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { Plus, Trash2, X } from "lucide-react"

import { useStockEntries, type StockEntryForm } from "@/app/hooks/useStockEntries"
import { useSuppliers } from "@/app/hooks/useSuppliers"
import { useProducts } from "@/app/hooks/useProducts"
import { ProductCombobox } from "@/components/product-combobox"
import { SupplierCombobox } from "@/components/supplier-combobox"
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

const fmt = (v: string | number) =>
    Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export default function StockEntriesPage() {
    const { entries, loading, filter, setFilter, createEntry, deleteEntry } = useStockEntries()
    const { suppliers } = useSuppliers()
    const { products } = useProducts()
    const [open, setOpen] = useState(false)

    const {
        register,
        handleSubmit,
        reset,
        control,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<StockEntryForm>({
        defaultValues: {
            entry_date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
            items: [{ product_id: "", quantity: 1, unit_cost: 0 }],
        },
    })

    const { fields, append, remove } = useFieldArray({ control, name: "items" })

    const openCreate = () => {
        reset({
            supplier_id: "",
            invoice_number: "",
            notes: "",
            entry_date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
            items: [{ product_id: "", quantity: 1, unit_cost: 0 }],
        })
        setOpen(true)
    }

    const onSubmit = handleSubmit(async (data) => {
        const payload: StockEntryForm = {
            ...data,
            invoice_number: data.invoice_number?.trim() || undefined,
            notes: data.notes?.trim() || undefined,
            entry_date: new Date(data.entry_date).toISOString(),
            items: data.items.map((item) => ({
                ...item,
                quantity: Number(item.quantity),
                unit_cost: Number(item.unit_cost),
            })),
        }
        const ok = await createEntry(payload)
        if (ok) {
            reset()
            setOpen(false)
        }
    })

    const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "—"

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Compras</h1>
                <Button size="sm" onClick={openCreate}>
                    <Plus className="h-4 w-4" />
                    Nova Entrada
                </Button>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Nova Entrada de Estoque</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={onSubmit} className="flex flex-col gap-4 mt-2">

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1 col-span-2">
                                <Label>Fornecedor *</Label>
                                <Controller
                                    name="supplier_id"
                                    control={control}
                                    rules={{ required: "Fornecedor obrigatório" }}
                                    render={({ field }) => (
                                        <SupplierCombobox
                                            value={field.value}
                                            onChange={field.onChange}
                                            suppliers={suppliers}
                                        />
                                    )}
                                />
                                {errors.supplier_id && <span className="text-xs text-red-500">{errors.supplier_id.message}</span>}
                            </div>

                            <div className="flex flex-col gap-1">
                                <Label htmlFor="invoice_number">Nº Nota Fiscal</Label>
                                <Input id="invoice_number" placeholder="Ex: NF-001" {...register("invoice_number")} />
                            </div>

                            <div className="flex flex-col gap-1">
                                <Label>Data de Entrada *</Label>
                                <Controller
                                    name="entry_date"
                                    control={control}
                                    rules={{ required: "Data obrigatória" }}
                                    render={({ field }) => (
                                        <DateTimePicker
                                            value={field.value}
                                            onChange={field.onChange}
                                        />
                                    )}
                                />
                                {errors.entry_date && <span className="text-xs text-red-500">{errors.entry_date.message}</span>}
                            </div>

                            <div className="flex flex-col gap-1 col-span-2">
                                <Label htmlFor="notes">Observações</Label>
                                <Input id="notes" placeholder="Opcional" {...register("notes")} />
                            </div>
                        </div>

                        <Separator />

                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Itens *</span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ product_id: "", quantity: 1, unit_cost: 0 })}
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
                                                    onSelect={(p) => setValue(`items.${index}.unit_cost`, Number(p.cost_price))}
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
                                            <Label>Custo unit. *</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min={0}
                                                placeholder="0,00"
                                                {...register(`items.${index}.unit_cost`, { required: true })}
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
                placeholder="Filtrar por nota fiscal ou observação..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="max-w-sm"
            />

            <div className="rounded-md border bg-neutral-50 dark:bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Fornecedor</TableHead>
                            <TableHead>Produtos</TableHead>
                            <TableHead>Nº NF</TableHead>
                            <TableHead>Observação</TableHead>
                            <TableHead>Valor Total</TableHead>
                            <TableHead>Data Entrada</TableHead>
                            <TableHead>Criado em</TableHead>
                            <TableHead className="w-[100px]" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 7 }).map((__, j) => (
                                        <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                                    ))}
                                    <TableCell />
                                </TableRow>
                            ))
                        ) : entries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground py-6 text-sm">
                                    Nenhuma entrada encontrada
                                </TableCell>
                            </TableRow>
                        ) : (
                            entries.map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell className="font-medium">{supplierName(entry.supplier_id)}</TableCell>
                                    <TableCell>
                                        {entry.items?.length ? (
                                            <ul className="flex flex-col gap-0.5">
                                                {entry.items.map((i) => (
                                                    <li key={i.product_id} className="flex items-center gap-1.5 text-xs">
                                                        <span className="font-medium">{i.product_name}</span>
                                                        <span className="text-muted-foreground">× {Number(i.quantity).toLocaleString("pt-BR")}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{entry.invoice_number ?? "—"}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{entry.notes ?? "—"}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{fmt(entry.total_value)}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{new Date(entry.entry_date).toLocaleString("pt-BR")}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{new Date(entry.created_at).toLocaleString("pt-BR")}</TableCell>
                                    <TableCell>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="sm">
                                                    <Trash2 className="h-4 w-4" />
                                                    Deletar
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Deletar esta entrada? Esta ação não pode ser desfeita.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        className="bg-red-600 hover:bg-red-700"
                                                        onClick={() => deleteEntry(entry.id)}
                                                    >
                                                        Deletar
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
