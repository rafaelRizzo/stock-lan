import { http } from "@/lib/http"

export type QuantityTypeStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED"
export type QuantityType = {
  id: string
  name: string
  status: QuantityTypeStatus
  createdAt: string
}
export type PaginatedQuantityTypes = {
  data: QuantityType[]
  total: number
  totalPage: number
  page: number
  limit: number
}
export type QuantityTypesParams = {
  page: number
  limit: number
  search?: string
  status?: QuantityTypeStatus
  includeArchived?: boolean
}

export const quantityTypesService = {
  async list(params: QuantityTypesParams) {
    const { data } = await http.get<PaginatedQuantityTypes>("/quantity-types", {
      params,
    })
    return data
  },
  async create(name: string) {
    const { data } = await http.post<QuantityType>("/quantity-types", { name })
    return data
  },
  async update(id: string, name: string) {
    const { data } = await http.patch<QuantityType>(`/quantity-types/${id}`, {
      name,
    })
    return data
  },
  async archive(id: string) {
    await http.delete(`/quantity-types/${id}`)
  },
  async restore(id: string) {
    await http.patch(`/quantity-types/${id}/restore`)
  },
  async delete(id: string) {
    await http.delete(`/quantity-types/${id}/permanent`)
  },
}
