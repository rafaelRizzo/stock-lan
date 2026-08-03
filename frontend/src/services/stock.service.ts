import { http } from "@/lib/http"

export type BatchStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED"
export type StockBatch = {
  id: string
  quantityIn: string | number
  quantityLeft: string | number
  priceBuy: string | number
  dateBuy: string
  notifyLimit: boolean
  quantityNotify: string | number | null
  obs: string | null
  status: BatchStatus
  product: { id: string; name: string }
  supplier: { id: string; name: string } | null
  quantityType: { id: string; name: string }
}
export type StockBatchesParams = {
  page: number
  limit: number
  search?: string
  status?: BatchStatus
  dateFrom?: string
  dateTo?: string
}
export type PaginatedStockBatches = {
  data: StockBatch[]
  total: number
  totalPage: number
  page: number
  limit: number
}
export type StockAlertBatch = Omit<StockBatch, "quantityType">
export type PaginatedStockAlerts = {
  data: StockAlertBatch[]
  total: number
  totalPage: number
  page: number
  limit: number
}
export type StockMovementType = "IN" | "OUT" | "ADJUSTMENT" | "REVERSAL"
export type StockMovement = {
  id: string
  type: StockMovementType
  quantity: string | number
  costUnit: string | number
  obs: string | null
  createdAt: string
  product: { id: string; name: string }
  stockBatch: { id: string }
  sale: { id: string; clientName: string | null } | null
}
export type ProductStock = {
  product: { id: string; name: string }
  available: string | number
  batches: StockBatch[]
}
export type PaginatedStockMovements = {
  data: StockMovement[]
  total: number
  totalPage: number
  page: number
  limit: number
}
export type StockMovementsParams = {
  page: number
  limit: number
  dateFrom?: string
  dateTo?: string
}
export type CreateStockBatchInput = {
  supplierId: string
  productId: string
  quantityTypeId: string
  quantityIn: number
  priceBuy: number
  dateBuy: Date
  notifyLimit: boolean
  quantityNotify?: number
  obs?: string
}
export type AddNoCostStockInput = {
  productId: string
  supplierId?: string
  quantityTypeId: string
  quantity: number
  obs?: string
}

export const stockService = {
  async listBatches(params: StockBatchesParams) {
    const { data } = await http.get<PaginatedStockBatches>("/stock/batches", {
      params,
    })
    return data
  },
  async createBatch(input: CreateStockBatchInput) {
    const { data } = await http.post<StockBatch>("/stock/batches", input)
    return data
  },
  async listMovements(params: StockMovementsParams) {
    const { data } = await http.get<PaginatedStockMovements>(
      "/stock/movements",
      { params }
    )
    return data
  },
  async listAlerts(params: { page: number; limit: number }) {
    const { data } = await http.get<PaginatedStockAlerts>("/stock/alerts", {
      params,
    })
    return data
  },
  async updateBatch(id: string, input: CreateStockBatchInput) {
    const { data } = await http.patch<StockBatch>(`/stock/batches/${id}`, input)
    return data
  },
  async deleteBatch(id: string) {
    await http.delete(`/stock/batches/${id}`)
  },
  async getProductStock(productId: string) {
    const { data } = await http.get<ProductStock>(`/stock/products/${productId}`)
    return data
  },
  async addNoCostStock(input: AddNoCostStockInput) {
    const { data } = await http.post<StockBatch>("/stock/no-cost", input)
    return data
  },
}
