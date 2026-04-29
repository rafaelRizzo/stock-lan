"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import Cookies from "universal-cookie"
import { toast } from "sonner"

export type Product = {
    id: string
    code?: string | null
    name: string
    description?: string
    category_id: string
    category?: { name: string }
    unit_id: string
    unit?: { name: string; abbreviation: string }
    cost_price: number | string
    sale_price: number | string
    current_stock?: string
    min_stock: number | string
    status: boolean
    created_at?: string
    updated_at?: string
}

export type ProductForm = {
    code?: string | null
    name: string
    description?: string
    category_id: string | null
    unit_id: string | null
    cost_price: number
    sale_price: number
    min_stock: number
    status: boolean
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"

export function useProducts() {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState("")

    const getToken = () => new Cookies().get("token")

    const headers = () => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
    })

    const fetchProducts = useCallback(async () => {
        setLoading(true)
        try {
            const { data } = await axios.get(`${API_URL}/products`, { headers: headers() })
            setProducts(data.products ?? [])
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao buscar produtos")
        } finally {
            setLoading(false)
        }
    }, [])

    const createProduct = async (form: ProductForm) => {
        const id = toast.loading("Criando produto...")
        try {
            await axios.post(`${API_URL}/products`, form, { headers: headers() })
            toast.success("Produto criado", { id })
            await fetchProducts()
            return true
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao criar produto", { id })
            return false
        }
    }

    const updateProduct = async (productId: string, form: ProductForm) => {
        const id = toast.loading("Atualizando...")
        try {
            await axios.put(`${API_URL}/products/${productId}`, form, { headers: headers() })
            toast.success("Produto atualizado", { id })
            await fetchProducts()
            return true
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao atualizar produto", { id })
            return false
        }
    }

    const deleteProduct = async (productId: string) => {
        const id = toast.loading("Deletando...")
        try {
            await axios.delete(`${API_URL}/products/${productId}`, { headers: headers() })
            toast.success("Produto deletado", { id })
            setProducts((prev) => prev.filter((p) => p.id !== productId))
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Erro ao deletar produto", { id })
        }
    }

    const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(filter.toLowerCase())
    )

    useEffect(() => {
        fetchProducts()
    }, [fetchProducts])

    return {
        products: filtered,
        loading,
        filter,
        setFilter,
        fetchProducts,
        createProduct,
        updateProduct,
        deleteProduct,
    }
}
