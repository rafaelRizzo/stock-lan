"use client"

import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { Plus, Trash2, Pencil } from "lucide-react"

import { useProducts, type Product, type ProductForm } from "@/app/hooks/useProducts"
import { useCategories } from "@/app/hooks/useCategories"
import { useUnits } from "@/app/hooks/useUnits"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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
import { Badge } from "@/components/ui/badge"

const fmt = (v: number | string) =>
    Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export default function ProductsPage() {
    const { products, loading, filter, setFilter, createProduct, updateProduct, deleteProduct } = useProducts()
    const { categories } = useCategories()
    const { units } = useUnits()

    const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "Nenhum"
    const unitAbbr = (id: string) => units.find((u) => u.id === id)?.abbreviation ?? "Nenhum"

    const [open, setOpen] = useState(false)
    const [editing, setEditing] = useState<Product | null>(null)

    const {
        register,
        handleSubmit,
        reset,
        control,
        formState: { errors, isSubmitting },
    } = useForm<ProductForm>({ defaultValues: { status: true } })

    const openCreate = () => {
        setEditing(null)
        reset({ name: "", code: "", description: "", category_id: "", unit_id: "", cost_price: 0, sale_price: 0, min_stock: 0, status: true })
        setOpen(true)
    }

    const openEdit = (p: Product) => {
        setEditing(p)
        reset({
            name: p.name,
            code: p.code ?? "",
            description: p.description ?? "",
            category_id: p.category_id ?? "none",
            unit_id: p.unit_id ?? "none",
            cost_price: Number(p.cost_price),
            sale_price: Number(p.sale_price),
            min_stock: Number(p.min_stock),
            status: p.status,
        })
        setOpen(true)
    }

    const onSubmit = handleSubmit(async (data) => {
        const payload = {
            ...data,
            code: data.code?.trim() || null,
            category_id: data.category_id === "none" ? null : data.category_id,
            unit_id: data.unit_id === "none" ? null : data.unit_id,
            cost_price: Number(data.cost_price),
            sale_price: Number(data.sale_price),
            min_stock: Number(data.min_stock),
        }
        const ok = editing
            ? await updateProduct(editing.id, payload)
            : await createProduct(payload)
        if (ok) {
            reset()
            setOpen(false)
            setEditing(null)
        }
    })

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Produtos</h1>
                <Button size="sm" onClick={openCreate}>
                    <Plus className="h-4 w-4" />
                    Novo Produto
                </Button>
            </div>

            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={onSubmit} className="flex flex-col gap-3 mt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1 col-span-2">
                                <Label htmlFor="name">Nome *</Label>
                                <Input
                                    id="name"
                                    placeholder="Ex: COCA ZERO 250ML"
                                    {...register("name", { required: "Nome obrigatório" })}
                                />
                                {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
                            </div>

                            <div className="flex flex-col gap-1">
                                <Label htmlFor="code">Código</Label>
                                <Input id="code" placeholder="Opcional" {...register("code")} />
                            </div>

                            <div className="flex flex-col gap-1">
                                <Label htmlFor="description">Descrição</Label>
                                <Input id="description" placeholder="Opcional" {...register("description")} />
                            </div>

                            <div className="flex flex-col gap-1">
                                <Label>Categoria *</Label>
                                <Controller
                                    name="category_id"
                                    control={control}
                                    rules={{ required: "Categoria obrigatória" }}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Selecione" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {categories.map((c) => (
                                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.category_id && <span className="text-xs text-red-500">{errors.category_id.message}</span>}
                            </div>

                            <div className="flex flex-col gap-1">
                                <Label>Unidade *</Label>
                                <Controller
                                    name="unit_id"
                                    control={control}
                                    rules={{ required: "Unidade obrigatória" }}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Selecione" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Nenhum</SelectItem>
                                                {units.map((u) => (
                                                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.abbreviation})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.unit_id && <span className="text-xs text-red-500">{errors.unit_id.message}</span>}
                            </div>

                            <div className="flex flex-col gap-1">
                                <Label htmlFor="cost_price">Preço de Custo *</Label>
                                <Input
                                    id="cost_price"
                                    type="number"
                                    step="0.01"
                                    placeholder="0,00"
                                    {...register("cost_price", { required: "Obrigatório" })}
                                />
                                {errors.cost_price && <span className="text-xs text-red-500">{errors.cost_price.message}</span>}
                            </div>

                            <div className="flex flex-col gap-1">
                                <Label htmlFor="sale_price">Preço de Venda *</Label>
                                <Input
                                    id="sale_price"
                                    type="number"
                                    step="0.01"
                                    placeholder="0,00"
                                    {...register("sale_price", { required: "Obrigatório" })}
                                />
                                {errors.sale_price && <span className="text-xs text-red-500">{errors.sale_price.message}</span>}
                            </div>

                            <div className="flex flex-col gap-1 col-span-full">
                                <Label htmlFor="min_stock">Estoque Mínimo *</Label>
                                <Input
                                    id="min_stock"
                                    type="number"
                                    placeholder="0"
                                    {...register("min_stock", { required: "Obrigatório" })}
                                />
                                {errors.min_stock && <span className="text-xs text-red-500">{errors.min_stock.message}</span>}
                            </div>
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

            <Input
                placeholder="Filtrar por nome..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="max-w-xs"
            />

            <div className="rounded-md border bg-neutral-50 dark:bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead>Unidade</TableHead>
                            <TableHead>Custo</TableHead>
                            <TableHead>Venda</TableHead>
                            <TableHead>Est. Atual</TableHead>
                            <TableHead>Est. Mín.</TableHead>
                            <TableHead>Criado em</TableHead>
                            <TableHead>Atualizado em</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-35" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 10 }).map((__, j) => (
                                        <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                                    ))}
                                    <TableCell />
                                </TableRow>
                            ))
                        ) : products.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={11} className="text-center text-muted-foreground py-6 text-sm">
                                    Nenhum produto encontrado
                                </TableCell>
                            </TableRow>
                        ) : (
                            products.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium">{p.name}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{categoryName(p.category_id)}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{unitAbbr(p.unit_id)}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{fmt(p.cost_price)}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{fmt(p.sale_price)}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{p.current_stock ? Number(p.current_stock).toLocaleString("pt-BR") : "0"}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{Number(p.min_stock).toLocaleString("pt-BR")}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{p.created_at ? new Date(p.created_at).toLocaleString("pt-BR") : "—"}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{p.updated_at ? new Date(p.updated_at).toLocaleString("pt-BR") : "—"}</TableCell>
                                    <TableCell>
                                        <Badge variant={p.status ? "default" : "secondary"}>
                                            {p.status ? "Ativo" : "Inativo"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => openEdit(p)}>
                                                <Pencil className="h-4 w-4" />
                                                Editar
                                            </Button>
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
                                                            Deletar <strong>{p.name}</strong>? Esta ação não pode ser desfeita.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-red-600 hover:bg-red-700"
                                                            onClick={() => deleteProduct(p.id)}
                                                        >
                                                            Deletar
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
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
