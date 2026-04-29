"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import Cookies from "universal-cookie"
import { toast } from "sonner"

export type Category = {
    id: string
    name: string
    description: string
    created_at?: string
    updated_at?: string
}

type CategoryForm = {
    name: string
    description?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"

export function useCategories() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState("")

    const getToken = () => new Cookies().get("token")

    const headers = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
    })

    const fetchCategories = useCallback(async () => {
        setLoading(true)
        try {
            const { data } = await axios.get(`${API_URL}/categories`, { headers: headers() })
            setCategories(data.categories ?? [])
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao buscar categorias")
        } finally {
            setLoading(false)
        }
    }, [])

    const createCategory = async (form: CategoryForm) => {
        const id = toast.loading("Criando categoria...")
        try {
            await axios.post(`${API_URL}/categories`, form, { headers: headers() })
            toast.success("Categoria criada", { id })
            await fetchCategories()
            return true
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao criar categoria", { id })
            return false
        }
    }

    const updateCategory = async (categoryId: string, form: CategoryForm) => {
        const id = toast.loading("Atualizando...")
        try {
            await axios.put(`${API_URL}/categories/${categoryId}`, form, { headers: headers() })
            toast.success("Categoria atualizada", { id })
            await fetchCategories()
            return true
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao atualizar categoria", { id })
            return false
        }
    }

    const deleteCategory = async (categoryId: string) => {
        const id = toast.loading("Deletando...")
        try {
            await axios.delete(`${API_URL}/categories/${categoryId}`, { headers: headers() })
            toast.success("Categoria deletada", { id })
            setCategories((prev) => prev.filter((c) => c.id !== categoryId))
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao deletar categoria", { id })
        }
    }

    const filtered = categories.filter((c) =>
        c.name.toLowerCase().includes(filter.toLowerCase())
    )

    useEffect(() => {
        fetchCategories()
    }, [fetchCategories])

    return {
        categories: filtered,
        loading,
        filter,
        setFilter,
        fetchCategories,
        createCategory,
        updateCategory,
        deleteCategory,
    }
}
