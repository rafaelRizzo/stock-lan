import { toast } from "@/components/ui/toast"

type ToastType = "success" | "info" | "warning" | "error"

function show(type: ToastType, title: string, description?: string) {
  toast.add({ description, timeout: 4000, title, type })
}

export const notify = {
  success: (title: string, description?: string) =>
    show("success", title, description),
  info: (title: string, description?: string) =>
    show("info", title, description),
  warning: (title: string, description?: string) =>
    show("warning", title, description),
  error: (title: string, description?: string) =>
    show("error", title, description),
}
