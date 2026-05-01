"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import Cookies from "universal-cookie"
import { toast } from "sonner"

export type Debtor = {
    id: string
    name: string
    phone: string | null
    notes: string | null
    status: boolean
    created_at: string
    updated_at: string
    total_debt: string
    total_exits: number
}

export type DebtorForm = {
    name: string
    phone?: string
    notes?: string
}

export type DebtorSummaryItem = {
    exit_id: string
    item_id: string
    quantity: string
    unit_price: string
    total_price: string
    product_id: string
    product_name: string
    product_code: string | null
}

export type DebtorSummaryExit = {
    id: string
    reason: string | null
    destination: string | null
    notes: string | null
    total_value: string
    payment_status: "paid" | "pending"
    debtor_id: string
    paid_at: string | null
    exit_date: string
    created_at: string
    items: DebtorSummaryItem[]
}

export type DebtorSummary = {
    id: string
    name: string
    phone: string | null
    notes: string | null
    pending_exits: DebtorSummaryExit[]
    paid_exits: DebtorSummaryExit[]
    summary: {
        total_exits: number
        total_debt: string
        total_paid: string
    }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"

export function useDebtors() {
    const [debtors, setDebtors] = useState<Debtor[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState("")

    const getToken = () => new Cookies().get("token")
    const headers = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
    })

    const fetchDebtors = useCallback(async () => {
        setLoading(true)
        try {
            const { data } = await axios.get(`${API_URL}/debtors`, { headers: headers() })
            setDebtors(data.debtors ?? [])
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao buscar devedores")
        } finally {
            setLoading(false)
        }
    }, [])

    const getDebtorSummary = async (debtorId: string, startDate: string, endDate: string): Promise<DebtorSummary | null> => {
        try {
            const { data } = await axios.get(
                `${API_URL}/debtors/${debtorId}/summary?start_date=${startDate}&end_date=${endDate}`,
                { headers: headers() }
            )
            return data.debtor ?? null
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao buscar resumo")
            return null
        }
    }

    const createDebtor = async (form: DebtorForm) => {
        const id = toast.loading("Criando devedor...")
        try {
            await axios.post(`${API_URL}/debtors`, form, { headers: headers() })
            toast.success("Devedor criado", { id })
            await fetchDebtors()
            return true
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao criar devedor", { id })
            return false
        }
    }

    const updateDebtor = async (debtorId: string, form: DebtorForm) => {
        const id = toast.loading("Atualizando...")
        try {
            await axios.put(`${API_URL}/debtors/${debtorId}`, form, { headers: headers() })
            toast.success("Devedor atualizado", { id })
            await fetchDebtors()
            return true
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao atualizar devedor", { id })
            return false
        }
    }

    const deleteDebtor = async (debtorId: string) => {
        const id = toast.loading("Deletando...")
        try {
            await axios.delete(`${API_URL}/debtors/${debtorId}`, { headers: headers() })
            toast.success("Devedor deletado", { id })
            setDebtors((prev) => prev.filter((d) => d.id !== debtorId))
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao deletar devedor", { id })
        }
    }

    const filtered = debtors.filter((d) =>
        d.name.toLowerCase().includes(filter.toLowerCase()) ||
        (d.phone ?? "").includes(filter)
    )

    useEffect(() => {
        fetchDebtors()
    }, [fetchDebtors])

    return {
        debtors: filtered,
        loading,
        filter,
        setFilter,
        fetchDebtors,
        getDebtorSummary,
        createDebtor,
        updateDebtor,
        deleteDebtor,
    }
}
