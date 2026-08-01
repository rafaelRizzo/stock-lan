import { http } from "@/lib/http"

export type NotificationItem = {
  id: string
  type: string
  title: string
  message: string
  entityType: string
  entityId: string
  createdAt: string
  read: boolean
}
export type PaginatedNotifications = {
  data: NotificationItem[]
  total: number
  totalPage: number
  page: number
  limit: number
}
export type NotificationsParams = {
  page: number
  limit: number
}

export const notificationsService = {
  async list(params: NotificationsParams) {
    const { data } = await http.get<PaginatedNotifications>("/notifications", {
      params,
    })
    return data
  },
  async unreadCount() {
    const { data } = await http.get<{ count: number }>(
      "/notifications/unread-count"
    )
    return data.count
  },
  async markRead(id: string) {
    await http.patch(`/notifications/${id}/read`)
  },
  async markAllRead() {
    await http.patch("/notifications/read-all")
  },
  async delete(id: string) {
    await http.delete(`/notifications/${id}`)
  },
}
