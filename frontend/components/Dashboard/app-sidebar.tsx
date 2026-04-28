"use client"
import * as React from "react"
import { GalleryVerticalEnd } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from 'next/link'

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import { useLogout } from "@/app/hooks/useLogout"

type NavSubItem =
    | { title: string; url: string; onClick?: never }
    | { title: string; url?: never; onClick: () => void }

type NavItem = {
    title: string
    url: string
    items: NavSubItem[]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()
    const { logout } = useLogout()

    const data: { navMain: NavItem[] } = {
        navMain: [
            {
                title: "Dashboard",
                url: "/dashboard",
                items: [
                    { title: "Visão Geral", url: "/dashboard" },
                ],
            },
            {
                title: "Estoque",
                url: "#",
                items: [
                    { title: "Compras", url: "/dashboard/stocks/entries" },
                    { title: "Vendas", url: "/dashboard/stocks/exits" },
                ],
            },
            {
                title: "Relatórios",
                url: "#",
                items: [
                    { title: "Resumo de Estoque", url: "/dashboard/reports/stocks" },
                    { title: "Movimentações", url: "/dashboard/reports/movements" },
                ],
            },
            {
                title: "Cadastros",
                url: "#",
                items: [
                    { title: "Categorias", url: "/dashboard/registers/categories" },
                    { title: "Unidades", url: "/dashboard/registers/units" },
                    { title: "Fornecedores", url: "/dashboard/registers/suppliers" },
                    { title: "Produtos", url: "/dashboard/registers/products" },
                ],
            },
            {
                title: "Outros",
                url: "#",
                items: [
                    { title: "Usuários", url: "/dashboard/others/users" },
                    { title: "Minha conta", url: "/dashboard/others/account" },
                    { title: "Sair", onClick: logout },
                ],
            },
        ],
    }
    const isActive = (href: string) => {
        if (href === "/dashboard") return pathname === "/dashboard"

        return pathname === href || pathname.startsWith(href + "/")
    }
    return (
        <Sidebar {...props}>
            <SidebarHeader>
                <SidebarMenu>

                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="#">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <GalleryVerticalEnd className="size-4" />
                                </div>
                                <div className="flex flex-col gap-0.5 leading-none">
                                    <span className="font-medium">Stock Lan</span>
                                    <span className="">v1.0.0</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarMenu>
                        {data.navMain.map((item) => (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton className="font-medium cursor-default pointer-events-none">
                                    {item.title}
                                </SidebarMenuButton>
                                {item.items?.length ? (
                                    <SidebarMenuSub>
                                        {item.items.map((subItem) => (
                                            <SidebarMenuSubItem key={subItem.title}>
                                                {subItem.onClick ? (
                                                    <SidebarMenuSubButton onClick={subItem.onClick}>
                                                        {subItem.title}
                                                    </SidebarMenuSubButton>
                                                ) : (
                                                    <SidebarMenuSubButton asChild isActive={isActive(subItem.url!)}>
                                                        <Link href={subItem.url!}>{subItem.title}</Link>
                                                    </SidebarMenuSubButton>
                                                )}
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                ) : null}
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroup>
            </SidebarContent>
            <SidebarRail />
        </Sidebar>
    )
}
