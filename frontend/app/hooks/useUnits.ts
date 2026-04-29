"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import Cookies from "universal-cookie"
import { toast } from "sonner"

export type Unit = {
    id: string
    name: string
    abbreviation: string
    created_at?: string
    updated_at?: string
}

type UnitForm = {
    name: string
    abbreviation: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"

export function useUnits() {
    const [units, setUnits] = useState<Unit[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState("")

    const getToken = () => new Cookies().get("token")

    const headers = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
    })

    const fetchUnits = useCallback(async () => {
        setLoading(true)
        try {
            const { data } = await axios.get(`${API_URL}/units`, { headers: headers() })
            setUnits(data.units ?? [])
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao buscar unidades")
        } finally {
            setLoading(false)
        }
    }, [])

    const createUnit = async (form: UnitForm) => {
        const id = toast.loading("Criando unidade...")
        try {
            await axios.post(`${API_URL}/units`, form, { headers: headers() })
            toast.success("Unidade criada", { id })
            await fetchUnits()
            return true
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao criar unidade", { id })
            return false
        }
    }

    const updateUnit = async (unitId: string, form: UnitForm) => {
        const id = toast.loading("Atualizando...")
        try {
            await axios.put(`${API_URL}/units/${unitId}`, form, { headers: headers() })
            toast.success("Unidade atualizada", { id })
            await fetchUnits()
            return true
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao atualizar unidade", { id })
            return false
        }
    }

    const deleteUnit = async (unitId: string) => {
        const id = toast.loading("Deletando...")
        try {
            await axios.delete(`${API_URL}/units/${unitId}`, { headers: headers() })
            toast.success("Unidade deletada", { id })
            setUnits((prev) => prev.filter((u) => u.id !== unitId))
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao deletar unidade", { id })
        }
    }

    const filtered = units.filter((u) =>
        u.name.toLowerCase().includes(filter.toLowerCase())
    )

    useEffect(() => {
        fetchUnits()
    }, [fetchUnits])

    return {
        units: filtered,
        loading,
        filter,
        setFilter,
        fetchUnits,
        createUnit,
        updateUnit,
        deleteUnit,
    }
}
