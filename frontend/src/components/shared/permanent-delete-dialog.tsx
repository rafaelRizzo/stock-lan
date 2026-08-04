import { useRef, useState } from "react"
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
import { getApiErrorMessage } from "@/lib/http"

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
  const [pending, setPending] = useState(false)
  const confirmRef = useRef<HTMLButtonElement>(null)
  async function confirm() {
    try {
      setPending(true)
      setError(null)
      await onConfirm()
      onClose()
    } catch (cause) {
      setError(getApiErrorMessage(cause))
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
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
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
