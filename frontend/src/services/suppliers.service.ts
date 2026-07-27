import { http } from "@/lib/http"

export type SupplierStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED"
export type Supplier = {
  id: string
  name: string
  phone: string | null
  obs: string | null
  status: SupplierStatus
  createdAt: string
}
export type PaginatedSuppliers = {
  data: Supplier[]
  total: number
  totalPage: number
  page: number
  limit: number
}
export type SuppliersParams = {
  page: number
  limit: number
  search?: string
  status?: SupplierStatus
  includeArchived?: boolean
}
export type SupplierInput = { name: string; phone?: string; obs?: string }

export const suppliersService = {
  async list(params: SuppliersParams) {
    const { data } = await http.get<PaginatedSuppliers>("/suppliers", {
      params,
    })
    return data
  },
  async create(input: SupplierInput) {
    const { data } = await http.post<Supplier>("/suppliers", input)
    return data
  },
  async update(id: string, input: Partial<SupplierInput>) {
    const { data } = await http.patch<Supplier>(`/suppliers/${id}`, input)
    return data
  },
  async archive(id: string) {
    await http.delete(`/suppliers/${id}`)
  },
  async delete(id: string) {
    await http.delete(`/suppliers/${id}/permanent`)
  },
}
