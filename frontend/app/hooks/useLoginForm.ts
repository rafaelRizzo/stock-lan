"use client"

import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import axios from "axios"
import Cookies from "universal-cookie"
import { toast } from "sonner"

type LoginFormData = {
    username: string
    password: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"

export const useLoginForm = () => {
    const router = useRouter()
    const cookies = new Cookies()

    const form = useForm<LoginFormData>({
        defaultValues: {
            username: "",
            password: "",
        },
    })

    const onSubmit = form.handleSubmit(async (data) => {
        const loading = toast.loading("Entrando...")

        try {
            const res = await axios.post(`${API_URL}/login`, data)

            const token = res.data?.token
            if (!token) throw new Error("Token não retornado")

            cookies.set("token", token, {
                path: "/",
                sameSite: "lax",
            })

            toast.success("Login realizado com sucesso", { id: loading })

            router.push("/dashboard")
        } catch (err: any) {
            const message =
                err?.response?.data?.message ||
                err?.message ||
                "Erro ao realizar login"

            toast.error(message, { id: loading })

            console.error("Login error:", err)
        }
    })

    return {
        ...form,
        onSubmit,
    }
}