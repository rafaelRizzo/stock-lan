import type { LucideIcon } from "lucide-react"
import {
  Boxes,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardList,
  HandCoins,
  LayoutDashboard,
  PackagePlus,
  PackageSearch,
  Settings2,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
  UsersRound,
  WalletCards,
} from "lucide-react"

export type NavigationItem = {
  icon: LucideIcon
  label: string
  to: string
  roles?: Array<"ADMIN" | "MANAGER" | "OPERATOR">
}

export type NavigationGroup = {
  label: string
  items: NavigationItem[]
}

export const navigationGroups: NavigationGroup[] = [
  {
    label: "VISÃO GERAL",
    items: [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "OPERAÇÃO",
    items: [
      { label: "Vendas", to: "/dashboard/sales", icon: ShoppingCart },
      { label: "Entradas", to: "/dashboard/stock/batches", icon: PackagePlus },
      {
        label: "Movimentações",
        to: "/dashboard/stock/movements",
        icon: ClipboardList,
      },
      {
        label: "Alertas de estoque",
        to: "/dashboard/stock/alerts",
        icon: PackageSearch,
      },
    ],
  },
  {
    label: "CADASTROS",
    items: [
      { label: "Produtos", to: "/dashboard/products", icon: Boxes },
      { label: "Fornecedores", to: "/dashboard/suppliers", icon: Truck },
      {
        label: "Tipos de quantidade",
        to: "/dashboard/quantity-types",
        icon: SlidersHorizontal,
      },
      { label: "Devedores", to: "/dashboard/debtors", icon: UsersRound },
    ],
  },
  {
    label: "FINANCEIRO",
    items: [
      { label: "Despesas", to: "/dashboard/expenses", icon: WalletCards },
      {
        label: "Contas a receber",
        to: "/dashboard/reports/debts",
        icon: HandCoins,
      },
      {
        label: "Relatórios",
        to: "/dashboard/reports",
        icon: ChartNoAxesCombined,
      },
    ],
  },
  {
    label: "ADMINISTRAÇÃO",
    items: [
      {
        label: "Usuários",
        to: "/dashboard/users",
        icon: Settings2,
        roles: ["ADMIN"],
      },
      {
        label: "Modelos de despesas",
        to: "/dashboard/expense-templates",
        icon: CircleDollarSign,
        roles: ["ADMIN", "MANAGER"],
      },
    ],
  },
]

export const pageTitles = new Map(
  navigationGroups.flatMap((group) =>
    group.items.map((item) => [item.to, item.label])
  )
)
