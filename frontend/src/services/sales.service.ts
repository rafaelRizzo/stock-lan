import { http } from "@/lib/http"

export type SaleStatus = "PAID" | "PENDING" | "FREE" | "DEBT" | "CANCELED"
export type PaymentMethod = "CASH" | "PIX" | "CARD" | "BANK_TRANSFER" | "OTHER"
export type Sale = {
  id: string
  clientName: string | null
  total: string | number
  status: SaleStatus
  createdAt: string
  debtor: { id: string; name: string } | null
  obs: string | null
  payments?: { id: string; method: PaymentMethod; amount: string | number }[]
  items: {
    id: string
    productId: string
    quantity: string | number
    priceUnit: string | number
    priceTotal: string | number
  }[]
}
export type SalesParams = {
  page: number
  limit: number
  search?: string
  status?: SaleStatus
  dateFrom?: string
  dateTo?: string
}
export type PaginatedSales = {
  data: Sale[]
  total: number
  totalPage: number
  page: number
  limit: number
}
export type CreateSaleInput = {
  clientName?: string
  status: Exclude<SaleStatus, "CANCELED">
  debtorId?: string
  paymentMethod?: PaymentMethod
  obs?: string
  items: { productId: string; quantity: number; priceUnit?: number }[]
}

export type SalePaymentInput = {
  amount: number
  method: PaymentMethod
  obs?: string
}

export const salesService = {
  async list(params: SalesParams) {
    const { data } = await http.get<PaginatedSales>("/sales", { params })
    return data
  },
  async create(input: CreateSaleInput) {
    const { data } = await http.post<Sale>("/sales", input)
    return data
  },
  async update(id: string, input: CreateSaleInput) {
    const { data } = await http.patch<Sale>(`/sales/${id}`, input)
    return data
  },
  async delete(id: string) {
    await http.delete(`/sales/${id}`)
  },
  async addPayment(id: string, input: SalePaymentInput) {
    const { data } = await http.post(`/sales/${id}/payments`, input)
    return data
  },
}
