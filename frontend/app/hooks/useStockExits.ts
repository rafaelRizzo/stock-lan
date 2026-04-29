"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import Cookies from "universal-cookie"
import { toast } from "sonner"

export type StockExitItem = {
    id: string
    exit_id: string
    product_id: string
    quantity: string
    unit_price: string
    total_price: string
}

export type StockExit = {
    id: string
    reason: string | null
    destination: string | null
    notes: string | null
    total_value: string
    exit_date: string
    payment_status: "paid" | "pending"
    paid_at: string | null
    created_by: string
    created_at: string
    items: StockExitItem[]
}

export type StockExitForm = {
    reason?: string
    destination?: string
    notes?: string
    exit_date: string
    payment_status: "paid" | "pending"
    paid_at?: string
    items: {
        product_id: string
        quantity: number
        unit_price: number
    }[]
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"

export function useStockExits() {
    const [exits, setExits] = useState<StockExit[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState("")

    const getToken = () => new Cookies().get("token")

    const headers = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
    })

    const fetchExits = useCallback(async () => {
        setLoading(true)
        try {
            const { data } = await axios.get(`${API_URL}/stock-exits`, { headers: headers() })
            setExits(data.exits ?? [])
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao buscar saídas")
        } finally {
            setLoading(false)
        }
    }, [])

    const createExit = async (form: StockExitForm) => {
        const id = toast.loading("Registrando venda...")
        try {
            await axios.post(`${API_URL}/stock-exits`, form, { headers: headers() })
            toast.success("Venda registrada", { id })
            await fetchExits()
            return true
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao registrar venda", { id })
            return false
        }
    }

    const markAsPaid = async (exitId: string) => {
        const id = toast.loading("Atualizando pagamento...")
        try {
            const { data } = await axios.patch(
                `${API_URL}/stock-exits/${exitId}/payment`,
                { payment_status: "paid" },
                { headers: headers() }
            )
            toast.success("Pagamento confirmado", { id })
            setExits((prev) => prev.map((e) => e.id === exitId ? { ...e, ...data.exit } : e))
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao atualizar pagamento", { id })
        }
    }

    const deleteExit = async (exitId: string) => {
        const id = toast.loading("Deletando...")
        try {
            await axios.delete(`${API_URL}/stock-exits/${exitId}`, { headers: headers() })
            toast.success("Venda deletada", { id })
            setExits((prev) => prev.filter((e) => e.id !== exitId))
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao deletar venda", { id })
        }
    }

    const filtered = exits.filter((e) =>
        (e.reason ?? "").toLowerCase().includes(filter.toLowerCase()) ||
        (e.destination ?? "").toLowerCase().includes(filter.toLowerCase())
    )

    useEffect(() => {
        fetchExits()
    }, [fetchExits])

    return {
        exits: filtered,
        loading,
        filter,
        setFilter,
        fetchExits,
        createExit,
        markAsPaid,
        deleteExit,
    }
}
