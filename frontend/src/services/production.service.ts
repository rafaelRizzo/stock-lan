import { http } from "@/lib/http"
import type { StockBatch } from "@/services/stock.service"

export type ProductionOrderStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED"

export type RecipeItem = {
  id: string
  rawProductId: string
  quantityPerUnit: string | number
  rawProduct: { id: string; name: string }
}

export type RecipeItemInput = {
  rawProductId: string
  quantityPerUnit: number
}

export type ProductionOrder = {
  id: string
  finishedProductId: string
  quantityTypeId: string
  quantityProduced: string | number
  costUnit: string | number
  dateProduced: string
  obs: string | null
  status: ProductionOrderStatus
  createdAt: string
  finishedProduct: { id: string; name: string }
  quantityType: { id: string; name: string }
  outputBatch: StockBatch | null
}

export type PaginatedProductionOrders = {
  data: ProductionOrder[]
  total: number
  totalPage: number
  page: number
  limit: number
}

export type ProductionOrdersParams = {
  page: number
  limit: number
  search?: string
  status?: ProductionOrderStatus
}

export type CreateProductionOrderInput = {
  finishedProductId: string
  quantityTypeId: string
  quantityProduced: number
  dateProduced: Date
  obs?: string
}

export const productionService = {
  async getRecipe(finishedProductId: string) {
    const { data } = await http.get<RecipeItem[]>(
      `/production/recipes/${finishedProductId}`
    )
    return data
  },
  async replaceRecipe(finishedProductId: string, items: RecipeItemInput[]) {
    const { data } = await http.patch<RecipeItem[]>(
      `/production/recipes/${finishedProductId}`,
      { items }
    )
    return data
  },
  async listOrders(params: ProductionOrdersParams) {
    const { data } = await http.get<PaginatedProductionOrders>(
      "/production/orders",
      { params }
    )
    return data
  },
  async createOrder(input: CreateProductionOrderInput) {
    const { data } = await http.post<ProductionOrder>(
      "/production/orders",
      input
    )
    return data
  },
  async updateOrder(id: string, input: CreateProductionOrderInput) {
    const { data } = await http.patch<ProductionOrder>(
      `/production/orders/${id}`,
      input
    )
    return data
  },
  async cancelOrder(id: string) {
    const { data } = await http.post<ProductionOrder>(
      `/production/orders/${id}/cancel`
    )
    return data
  },
}
