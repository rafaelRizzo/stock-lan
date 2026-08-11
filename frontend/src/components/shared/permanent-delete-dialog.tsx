import { useRef, useState } from "react"
import { Link } from "@tanstack/react-router"
import { LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  getApiErrorDetails,
  getApiErrorMessage,
  type LinkedRecordDetail,
} from "@/lib/http"

export function PermanentDeleteDialog({
  open,
  name,
  resource,
  onClose,
  onConfirm,
}: {
  open: boolean
  name?: string
  resource: string
  onClose: () => void
  onConfirm: () => Promise<unknown>
}) {
  const [error, setError] = useState<string | null>(null)
  const [linkedRecords, setLinkedRecords] = useState<LinkedRecordDetail[]>([])
  const [pending, setPending] = useState(false)
  const confirmRef = useRef<HTMLButtonElement>(null)
  async function confirm() {
    try {
      setPending(true)
      setError(null)
      setLinkedRecords([])
      await onConfirm()
      onClose()
    } catch (cause) {
      setError(getApiErrorMessage(cause))
      setLinkedRecords(getApiErrorDetails(cause) ?? [])
    } finally {
      setPending(false)
    }
  }
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-md" initialFocus={confirmRef}>
        <DialogHeader>
          <DialogTitle>Excluir {resource}?</DialogTitle>
          <DialogDescription>
            {name
              ? `${name} será removido permanentemente.`
              : "O registro será removido permanentemente."}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Registros com vínculos não podem ser excluídos.
        </p>
        {error && (
          <div className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <p>{error}</p>
            {linkedRecords.length > 0 && (
              <ul className="mt-2 space-y-1">
                {linkedRecords.map((detail) => (
                  <li
                    className="flex items-center justify-between gap-2"
                    key={detail.label}
                  >
                    <span>
                      {detail.count} {detail.label}
                    </span>
                    <Link
                      className="font-medium underline underline-offset-2 hover:no-underline"
                      onClick={onClose}
                      params={{ _splat: detail.path.replace(/^\/dashboard\//, "") }}
                      to="/dashboard/$"
                    >
                      Ver
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <DialogFooter>
          <Button onClick={onClose} type="button" variant="outline">
            Cancelar
          </Button>
          <Button
            ref={confirmRef}
            disabled={pending}
            onClick={confirm}
            type="button"
            variant="destructive"
          >
            {pending && <LoaderCircle className="size-4 animate-spin" />}{" "}
            Excluir permanentemente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
