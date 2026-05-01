"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import Cookies from "universal-cookie"
import { toast } from "sonner"

export type StockEntry = {
    id: string
    supplier_id: string
    invoice_number: string | null
    notes: string | null
    total_value: string
    entry_date: string
    created_by: string
    created_at: string
    items?: Array<{ entry_id: string; product_id: string; product_name: string; quantity: string; unit_cost: string }>
}

export type StockEntryItem = {
    product_id: string
    quantity: number
    unit_cost: number
}

export type StockEntryForm = {
    supplier_id: string
    invoice_number?: string
    notes?: string
    entry_date: string
    items: StockEntryItem[]
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"

export function useStockEntries() {
    const [entries, setEntries] = useState<StockEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState("")

    const getToken = () => new Cookies().get("token")

    const headers = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
    })

    const fetchEntries = useCallback(async () => {
        setLoading(true)
        try {
            const { data } = await axios.get(`${API_URL}/stock-entries`, { headers: headers() })
            setEntries(data.entries ?? [])
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao buscar entradas")
        } finally {
            setLoading(false)
        }
    }, [])

    const createEntry = async (form: StockEntryForm) => {
        const id = toast.loading("Registrando entrada...")
        try {
            await axios.post(`${API_URL}/stock-entries`, form, { headers: headers() })
            toast.success("Entrada registrada", { id })
            await fetchEntries()
            return true
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao registrar entrada", { id })
            return false
        }
    }

    const deleteEntry = async (entryId: string) => {
        const id = toast.loading("Deletando...")
        try {
            await axios.delete(`${API_URL}/stock-entries/${entryId}`, { headers: headers() })
            toast.success("Entrada deletada", { id })
            setEntries((prev) => prev.filter((e) => e.id !== entryId))
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao deletar entrada", { id })
        }
    }

    const filtered = entries.filter((e) =>
        (e.invoice_number ?? "").toLowerCase().includes(filter.toLowerCase()) ||
        (e.notes ?? "").toLowerCase().includes(filter.toLowerCase())
    )

    useEffect(() => {
        fetchEntries()
    }, [fetchEntries])

    return {
        entries: filtered,
        loading,
        filter,
        setFilter,
        fetchEntries,
        createEntry,
        deleteEntry,
    }
}
