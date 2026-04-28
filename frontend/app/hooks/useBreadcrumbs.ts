"use client"

import { usePathname } from "next/navigation"

export const useBreadcrumbs = () => {
    const pathname = usePathname()

    const segments = pathname.split("/").filter(Boolean)

    const breadcrumbs = segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/")

        return {
            label: segment
                .replace(/-/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase()),
            href,
        }
    })

    return breadcrumbs
}