import { Link, useLocation } from "@tanstack/react-router"
import { LogOut, PackageCheck } from "lucide-react"

import { navigationGroups } from "@/components/dashboard/dashboard-navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useLogout } from "@/hooks/auth/use-logout"
import type { AuthUser } from "@/services/auth.service"

export function AppSidebar({ user }: { user?: AuthUser }) {
  const { pathname } = useLocation()
  const logout = useLogout()
  const initials =
    user?.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => name[0])
      .join("")
      .toUpperCase() ?? "AD"

  return (
    <Sidebar className="print:hidden" collapsible="icon" variant="inset">
      <SidebarHeader className="p-3">
        <Link className="flex items-center gap-3 px-2 py-2" to="/dashboard">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#173f31] text-white shadow-lg shadow-[#173f31]/15">
            <PackageCheck className="size-[18px]" />
          </span>
          <span className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <strong className="truncate text-sm tracking-[-0.02em]">
              Stock LAN
            </strong>
            <span className="truncate text-xs text-sidebar-foreground/55">
              Gestão de estoque
            </span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-1 pb-3">
        {navigationGroups.map((group) => {
          const items = group.items.filter(
            (item) => !item.roles || (user && item.roles.includes(user.role))
          )
          if (items.length === 0) return null

          return (
            <SidebarGroup className="p-2" key={group.label}>
              <SidebarGroupLabel className="px-3 text-[10px] font-semibold tracking-[0.12em] text-sidebar-foreground/45">
                {group.label}
              </SidebarGroupLabel>
              <SidebarMenu>
                {items.map((item) => {
                  const isActive =
                    pathname === item.to ||
                    (item.to !== "/dashboard" &&
                      pathname.startsWith(`${item.to}/`))
                  const Icon = item.icon
                  const dashboardPath = item.to.replace("/dashboard/", "")
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        isActive={isActive}
                        render={
                          item.to === "/dashboard" ? (
                            <Link to="/dashboard" />
                          ) : (
                            <Link
                              params={{ _splat: dashboardPath }}
                              to="/dashboard/$"
                            />
                          )
                        }
                        tooltip={item.label}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2 rounded-2xl bg-sidebar-accent/70 p-2 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
          <Avatar className="size-8 bg-[#dceee2] text-[#245742] dark:bg-emerald-950 dark:text-emerald-300">
            {user?.photo && <AvatarImage alt={user.name} src={user.photo} />}
            <AvatarFallback className="bg-[#dceee2] text-xs font-semibold text-[#245742] dark:bg-emerald-950 dark:text-emerald-300">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-xs font-semibold">
              {user?.name ?? "Carregando..."}
            </p>
            <p className="truncate text-[11px] text-sidebar-foreground/55">
              {user?.role ?? ""}
            </p>
          </div>
          <button
            aria-label="Sair"
            className="grid size-7 shrink-0 place-items-center rounded-lg text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden hover:bg-background hover:text-destructive"
            disabled={logout.isPending}
            onClick={() => logout.mutate()}
            type="button"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
