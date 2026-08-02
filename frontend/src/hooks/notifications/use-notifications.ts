import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  notificationsService,
  type NotificationsParams,
} from "@/services/notifications.service"

export function useNotifications(params: NotificationsParams) {
  return useQuery({
    queryKey: ["notifications", "list", params],
    queryFn: () => notificationsService.list(params),
    refetchInterval: 60_000,
  })
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => notificationsService.unreadCount(),
    refetchInterval: 60_000,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => notificationsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}
