"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import Cookies from "universal-cookie"
import { toast } from "sonner"

export type Supplier = {
    id: string
    name: string
    phone: string
    created_at?: string
    updated_at?: string
}

type SupplierForm = {
    name: string
    phone: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"

export function useSuppliers() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState("")

    const getToken = () => new Cookies().get("token")

    const headers = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
    })

    const fetchSuppliers = useCallback(async () => {
        setLoading(true)
        try {
            const { data } = await axios.get(`${API_URL}/suppliers`, { headers: headers() })
            setSuppliers(data.suppliers ?? [])
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao buscar fornecedores")
        } finally {
            setLoading(false)
        }
    }, [])

    const createSupplier = async (form: SupplierForm) => {
        const id = toast.loading("Criando fornecedor...")
        try {
            await axios.post(`${API_URL}/suppliers`, form, { headers: headers() })
            toast.success("Fornecedor criado", { id })
            await fetchSuppliers()
            return true
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao criar fornecedor", { id })
            return false
        }
    }

    const updateSupplier = async (supplierId: string, form: SupplierForm) => {
        const id = toast.loading("Atualizando...")
        try {
            await axios.put(`${API_URL}/suppliers/${supplierId}`, form, { headers: headers() })
            toast.success("Fornecedor atualizado", { id })
            await fetchSuppliers()
            return true
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao atualizar fornecedor", { id })
            return false
        }
    }

    const deleteSupplier = async (supplierId: string) => {
        const id = toast.loading("Deletando...")
        try {
            await axios.delete(`${API_URL}/suppliers/${supplierId}`, { headers: headers() })
            toast.success("Fornecedor deletado", { id })
            setSuppliers((prev) => prev.filter((s) => s.id !== supplierId))
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao deletar fornecedor", { id })
        }
    }

    const filtered = suppliers.filter((s) =>
        s.name.toLowerCase().includes(filter.toLowerCase())
    )

    useEffect(() => {
        fetchSuppliers()
    }, [fetchSuppliers])

    return {
        suppliers: filtered,
        loading,
        filter,
        setFilter,
        fetchSuppliers,
        createSupplier,
        updateSupplier,
        deleteSupplier,
    }
}
