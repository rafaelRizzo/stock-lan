"use client"

import { useRouter } from "next/navigation"
import Cookies from "universal-cookie"

export const useLogout = () => {
    const router = useRouter()
    const cookies = new Cookies()

    const logout = () => {
        cookies.remove("token", { path: "/" }) // remove cookie

        router.replace("/login") // evita voltar com back
    }

    return { logout }
}