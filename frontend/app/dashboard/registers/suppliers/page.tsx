"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { Plus, Trash2, Pencil } from "lucide-react"

import { useSuppliers, type Supplier } from "@/app/hooks/useSuppliers"
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

type SupplierForm = {
    name: string
    phone: string
}

export default function SuppliersPage() {
    const { suppliers, loading, filter, setFilter, createSupplier, updateSupplier, deleteSupplier } = useSuppliers()
    const [open, setOpen] = useState(false)
    const [editing, setEditing] = useState<Supplier | null>(null)

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<SupplierForm>()

    const openCreate = () => {
        setEditing(null)
        reset({ name: "", phone: "" })
        setOpen(true)
    }

    const openEdit = (supplier: Supplier) => {
        setEditing(supplier)
        reset({ name: supplier.name, phone: supplier.phone })
        setOpen(true)
    }

    const onSubmit = handleSubmit(async (data) => {
        const ok = editing
            ? await updateSupplier(editing.id, data)
            : await createSupplier(data)
        if (ok) {
            reset()
            setOpen(false)
            setEditing(null)
        }
    })

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Fornecedores</h1>
                <Button size="sm" onClick={openCreate}>
                    <Plus className="h-4 w-4" />
                    Novo Fornecedor
                </Button>
            </div>

            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={onSubmit} className="flex flex-col gap-3 mt-2">
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="name">Nome *</Label>
                            <Input
                                id="name"
                                placeholder="Ex: FORNECEDOR TABONZINHO"
                                {...register("name", { required: "Nome obrigatório" })}
                            />
                            {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="phone">Telefone *</Label>
                            <Input
                                id="phone"
                                placeholder="Ex: 18999999999"
                                {...register("phone", { required: "Telefone obrigatório" })}
                            />
                            {errors.phone && <span className="text-xs text-red-500">{errors.phone.message}</span>}
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
                            <TableHead>Telefone</TableHead>
                            <TableHead>Criado em</TableHead>
                            <TableHead>Atualizado em</TableHead>
                            <TableHead className="w-35" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell />
                                </TableRow>
                            ))
                        ) : suppliers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-sm">
                                    Nenhum fornecedor encontrado
                                </TableCell>
                            </TableRow>
                        ) : (
                            suppliers.map((supplier) => (
                                <TableRow key={supplier.id}>
                                    <TableCell className="font-medium">{supplier.name}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{supplier.phone}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{supplier.created_at ? new Date(supplier.created_at).toLocaleString("pt-BR") : "—"}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{supplier.updated_at ? new Date(supplier.updated_at).toLocaleString("pt-BR") : "—"}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => openEdit(supplier)}>
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
                                                            Deletar <strong>{supplier.name}</strong>? Esta ação não pode ser desfeita.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            className="bg-red-600 hover:bg-red-700"
                                                            onClick={() => deleteSupplier(supplier.id)}
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
