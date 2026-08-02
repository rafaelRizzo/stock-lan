import { http } from "@/lib/http"

export type ProductStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED"
export type ProductType = "RAW_MATERIAL" | "FINISHED" | "BOTH"
export type Product = {
  id: string
  name: string
  priceSell: string | number | null
  type: ProductType
  obs: string | null
  status: ProductStatus
  createdAt: string
  stockQuantity?: string | number
}
export type PaginatedProducts = {
  data: Product[]
  total: number
  totalPage: number
  page: number
  limit: number
}
export type ProductsParams = {
  page: number
  limit: number
  search?: string
  status?: ProductStatus
  includeArchived?: boolean
  stockOrder?: "asc" | "desc"
  type?: ProductType
  typeNot?: ProductType
}
export type CreateProductInput = {
  name: string
  priceSell?: number
  type?: ProductType
  obs?: string
  initialQuantity?: number
  initialQuantityTypeId?: string
}

export const productsService = {
  async list(params: ProductsParams) {
    const { data } = await http.get<PaginatedProducts>("/products", { params })
    return data
  },
  async create(input: CreateProductInput) {
    const { data } = await http.post<Product>("/products", input)
    return data
  },
  async update(id: string, input: Partial<CreateProductInput>) {
    const { data } = await http.patch<Product>(`/products/${id}`, input)
    return data
  },
  async archive(id: string) {
    await http.delete(`/products/${id}`)
  },
  async restore(id: string) {
    await http.patch(`/products/${id}/restore`)
  },
  async delete(id: string) {
    await http.delete(`/products/${id}/permanent`)
  },
}
