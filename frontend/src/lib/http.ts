import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"

import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  saveSession,
  type AuthSession,
} from "@/lib/auth"

export const API_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3333"
).replace(/\/$/, "")

export const http = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
})

type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean }

const apiErrorMessages: Record<string, string> = {
  "Canceled sale cannot be edited": "A venda cancelada não pode ser editada.",
  "Cannot archive the current user": "Não é possível arquivar o usuário atual.",
  Forbidden: "Você não tem permissão para esta ação.",
  "Initial setup already completed": "A configuração inicial já foi concluída.",
  "Insufficient stock": "Estoque insuficiente.",
  "Internal server error": "Ocorreu um erro interno. Tente novamente.",
  "Invalid refresh token": "Sua sessão expirou. Entre novamente.",
  "Invalid username or password": "Usuário ou senha inválidos.",
  "Not implemented": "Este recurso ainda não está disponível.",
  "Payment exceeds sale total": "O pagamento excede o total da venda.",
  "Product not found": "Produto não encontrado.",
  "Resource cannot be deleted because it has linked records":
    "O registro não pode ser excluído porque possui vínculos.",
  "Resource not found": "Registro não encontrado.",
  "Sale already canceled": "A venda já está cancelada.",
  "Sale cannot receive payments": "A venda não pode receber pagamentos.",
  "Sale not found": "Venda não encontrada.",
  "Stock batch cannot be deleted after stock movements":
    "O lote não pode ser excluído após movimentações de estoque.",
  "Stock batch cannot be edited after stock movements":
    "O lote não pode ser editado após movimentações de estoque.",
  "Stock batch not found": "Lote de estoque não encontrado.",
  "Supplier cannot be deleted because it has linked records":
    "O fornecedor não pode ser excluído porque possui vínculos.",
  "Supplier not found": "Fornecedor não encontrado.",
  Unauthorized: "Sua sessão expirou. Entre novamente.",
  "User not found": "Usuário não encontrado.",
  "debtorId is required for debt sales":
    "Selecione o devedor para uma venda fiada.",
  "paymentMethod is required for paid sales":
    "Selecione a forma de pagamento para uma venda paga.",
  "quantityNotify is required when notifyLimit is true":
    "Informe a quantidade mínima para o alerta de estoque.",
}

const fallbackApiErrorMessages: Record<number, string> = {
  400: "Dados inválidos. Revise os campos informados.",
  401: "Sua sessão expirou. Entre novamente.",
  403: "Você não tem permissão para esta ação.",
  404: "Registro não encontrado.",
  409: "Não foi possível concluir a ação devido a um conflito.",
}

http.interceptors.request.use((config) => {
  const accessToken = getAccessToken()

  if (accessToken) {
    config.headers.set("Authorization", `Bearer ${accessToken}`)
  }

  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as RetriableRequest | undefined
    const isRefreshRequest = request?.url?.includes("/auth/refresh")

    if (
      error.response?.status !== 401 ||
      !request ||
      request._retry ||
      isRefreshRequest
    ) {
      return Promise.reject(error)
    }

    const refreshToken = getRefreshToken()

    if (!refreshToken) {
      clearSession()
      window.dispatchEvent(new Event("auth:expired"))
      return Promise.reject(error)
    }

    request._retry = true

    try {
      const { data } = await axios.post<AuthSession>(
        `${API_URL}/auth/refresh`,
        { refreshToken }
      )

      saveSession(data)
      request.headers.set("Authorization", `Bearer ${data.accessToken}`)
      return http(request)
    } catch {
      clearSession()
      window.dispatchEvent(new Event("auth:expired"))
      return Promise.reject(error)
    }
  }
)

export function getApiErrorMessage(error: unknown) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    const message = error.response?.data?.message
    const status = error.response?.status

    return (
      (message && apiErrorMessages[message]) ||
      (status && fallbackApiErrorMessages[status]) ||
      "Não foi possível concluir a solicitação."
    )
  }

  return "Não foi possível conectar ao servidor."
}
