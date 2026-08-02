import { useEffect, useState, type FormEvent } from "react"
import {
  Archive,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TableSkeletonRows } from "@/components/shared/table-skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useArchiveUser,
  useCreateUser,
  useRestoreUser,
  useUpdateUser,
  useUsers,
} from "@/hooks/users/use-users"
import { DEFAULT_PAGE_SIZE } from "@/lib/constants"
import { getApiErrorMessage } from "@/lib/http"
import type {
  CreateUserInput,
  User,
  UserRole,
  UserStatus,
} from "@/services/users.service"

const pageSize = DEFAULT_PAGE_SIZE

export function UsersPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<UserStatus | "">("")
  const [createOpen, setCreateOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<User | null>(null)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const users = useUsers({
    page,
    limit: pageSize,
    search: search || undefined,
    status: status || undefined,
  })
  const archive = useArchiveUser()
  const restore = useRestoreUser()

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <UsersRound className="size-4" /> Administração
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
            Usuários
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Gerencie os acessos e permissões da operação.
          </p>
        </div>
        <Button
          className="h-10 rounded-xl bg-[#173f31] text-white hover:bg-[#245742]"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" /> Novo usuário
        </Button>
      </div>

      <section className="rounded-2xl border border-[#e5e9e4] bg-background dark:border-border">
        <div className="flex flex-col gap-3 border-b border-[#e5e9e4] p-4 sm:flex-row sm:items-center dark:border-border">
          <div className="relative w-full sm:w-[28rem]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 rounded-xl pl-9 shadow-none"
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Buscar por nome ou usuário"
              value={search}
            />
          </div>
          <Select
            onValueChange={(value) => {
              setStatus(value === "ALL" ? "" : (value as UserStatus))
              setPage(1)
            }}
            value={status || "ALL"}
          >
            <SelectTrigger className="h-10! w-full rounded-xl! border-[#dce3de]! bg-input/50! px-2.5! py-1! text-sm shadow-none data-[size=default]:h-10! sm:w-52 dark:border-border!">
              <span>
                {status
                  ? {
                      ACTIVE: "Ativos",
                      INACTIVE: "Inativos",
                      ARCHIVED: "Arquivados",
                    }[status]
                  : "Todos os status"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os status</SelectItem>
              <SelectItem value="ACTIVE">Ativos</SelectItem>
              <SelectItem value="INACTIVE">Inativos</SelectItem>
              <SelectItem value="ARCHIVED">Arquivados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Usuário</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Criado em</TableHead>
              <TableHead className="w-14" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.isLoading && (
              <TableSkeletonRows
                columns={[
                  { className: "py-3 pl-5", variant: "avatar", width: "w-40" },
                  { width: "w-20" },
                  { variant: "badge", width: "w-16" },
                  { className: "hidden md:table-cell", width: "w-24" },
                  { variant: "actions" },
                ]}
              />
            )}
            {!users.isLoading &&
              users.data?.data.map((user) => (
                <UserRow
                  key={user.id}
                  onArchive={setArchiveTarget}
                  onEdit={setEditTarget}
                  onRestore={(item) => restore.mutate(item.id)}
                  restoring={restore.isPending}
                  user={user}
                />
              ))}
            {!users.isLoading && users.data?.data.length === 0 && (
              <TableRow>
                <TableCell
                  className="h-52 text-center text-muted-foreground"
                  colSpan={5}
                >
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t border-[#e5e9e4] p-4 text-sm dark:border-border">
          <span className="text-muted-foreground">
            {users.data?.total ?? 0} usuário{users.data?.total === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              aria-label="Página anterior"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              size="icon-sm"
              variant="outline"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              Página {page} de {users.data?.totalPage ?? 1}
            </span>
            <Button
              aria-label="Próxima página"
              disabled={!users.data || page >= users.data.totalPage}
              onClick={() => setPage((value) => value + 1)}
              size="icon-sm"
              variant="outline"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>
      <CreateDialog onOpenChange={setCreateOpen} open={createOpen} />
      <EditUserDialog onClose={() => setEditTarget(null)} user={editTarget} />
      <ArchiveDialog
        onClose={() => setArchiveTarget(null)}
        onConfirm={() =>
          archiveTarget &&
          archive.mutate(archiveTarget.id, {
            onSuccess: () => setArchiveTarget(null),
          })
        }
        pending={archive.isPending}
        user={archiveTarget}
      />
    </div>
  )
}

function UserRow({
  onArchive,
  onEdit,
  onRestore,
  restoring,
  user,
}: {
  onArchive: (user: User) => void
  onEdit: (user: User) => void
  onRestore: (user: User) => void
  restoring: boolean
  user: User
}) {
  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0])
    .join("")
    .toUpperCase()
  return (
    <TableRow>
      <TableCell className="py-3 pl-5">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage alt={user.name} src={user.photo ?? undefined} />
            <AvatarFallback className="bg-muted text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">@{user.username}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <RoleBadge role={user.role} />
      </TableCell>
      <TableCell>
        <StatusBadge status={user.status} />
      </TableCell>
      <TableCell className="hidden text-muted-foreground md:table-cell">
        {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(
          new Date(user.createdAt)
        )}
      </TableCell>
      <TableCell>
        <Button
          aria-label={`Editar ${user.name}`}
          className="text-muted-foreground hover:text-foreground"
          onClick={() => onEdit(user)}
          size="icon-sm"
          variant="ghost"
        >
          <Pencil className="size-4" />
        </Button>
        {user.status === "ARCHIVED" ? (
          <Button
            aria-label={`Restaurar ${user.name}`}
            className="text-muted-foreground hover:text-foreground"
            disabled={restoring}
            onClick={() => onRestore(user)}
            size="icon-sm"
            variant="ghost"
          >
            <ArchiveRestore className="size-4" />
          </Button>
        ) : (
          <Button
            aria-label={`Arquivar ${user.name}`}
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onArchive(user)}
            size="icon-sm"
            variant="ghost"
          >
            <Archive className="size-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

function RoleBadge({ role }: { role: UserRole }) {
  const labels = {
    ADMIN: "Administrador",
    MANAGER: "Gerente",
    OPERATOR: "Operador",
  }
  return (
    <Badge
      className="gap-1.5 bg-muted text-muted-foreground dark:bg-zinc-800 dark:text-zinc-300"
      variant="secondary"
    >
      <ShieldCheck className="size-3" />
      {labels[role]}
    </Badge>
  )
}
function StatusBadge({ status }: { status: UserStatus }) {
  const styles = {
    ACTIVE:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    INACTIVE:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    ARCHIVED: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  }
  const labels = { ACTIVE: "Ativo", INACTIVE: "Inativo", ARCHIVED: "Arquivado" }
  return <Badge className={styles[status]}>{labels[status]}</Badge>
}

function CreateDialog({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const [input, setInput] = useState<CreateUserInput>({
    name: "",
    username: "",
    password: "",
    role: "OPERATOR",
  })
  const [error, setError] = useState<string | null>(null)
  const create = useCreateUser()
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!input.name.trim() || !input.username.trim() || !input.password)
      return setError("Preencha todos os campos.")
    if (input.username.trim().length < 3)
      return setError("O usuário precisa ter pelo menos 3 caracteres.")
    if (input.password.length < 12)
      return setError("A senha precisa ter pelo menos 12 caracteres.")
    setError(null)
    try {
      await create.mutateAsync({
        ...input,
        name: input.name.trim(),
        username: input.username.trim(),
      })
      setInput({ name: "", username: "", password: "", role: "OPERATOR" })
      onOpenChange(false)
    } catch (reason) {
      setError(getApiErrorMessage(reason))
    }
  }
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>
            Defina os dados e a permissão de acesso.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <FormInput
            label="Nome"
            onChange={(value) =>
              setInput((current) => ({ ...current, name: value }))
            }
            placeholder="Nome do usuário"
            value={input.name}
          />
          <FormInput
            label="Usuário"
            onChange={(value) =>
              setInput((current) => ({ ...current, username: value }))
            }
            placeholder="Ex.: operador"
            value={input.username}
          />
          <FormInput
            label="Senha"
            onChange={(value) =>
              setInput((current) => ({ ...current, password: value }))
            }
            placeholder="Mínimo de 12 caracteres"
            type="password"
            value={input.password}
          />
          <div className="grid gap-2 text-sm font-medium">
            Função
            <Select
              onValueChange={(value) =>
                setInput((current) => ({
                  ...current,
                  role: value as UserRole,
                }))
              }
              value={input.role}
            >
              <SelectTrigger className="h-10! w-full rounded-xl! border-[#dce3de]! bg-input/50! px-2.5! py-1! text-sm shadow-none data-[size=default]:h-10! dark:border-border!">
                <span>
                  {
                    {
                      OPERATOR: "Operador",
                      MANAGER: "Gerente",
                      ADMIN: "Administrador",
                    }[input.role]
                  }
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPERATOR">Operador</SelectItem>
                <SelectItem value="MANAGER">Gerente</SelectItem>
                <SelectItem value="ADMIN">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm font-medium text-red-400">{error}</p>}
          <DialogFooter>
            <Button
              className="rounded-xl bg-[#173f31] text-white hover:bg-[#245742]"
              disabled={create.isPending}
              type="submit"
            >
              {create.isPending && (
                <LoaderCircle className="size-4 animate-spin" />
              )}
              Criar usuário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FormInput({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
  value: string
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <Input
        className="h-10 rounded-xl border-[#dce3de] bg-background shadow-none dark:border-border"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  )
}
function EditUserDialog({
  onClose,
  user,
}: {
  onClose: () => void
  user: User | null
}) {
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [role, setRole] = useState<UserRole>("OPERATOR")
  const [error, setError] = useState<string | null>(null)
  const update = useUpdateUser()
  useEffect(() => {
    if (user) {
      setName(user.name)
      setUsername(user.username)
      setRole(user.role)
      setError(null)
    }
  }, [user])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || !name.trim() || username.trim().length < 3)
      return setError("Informe nome e usuário válido.")
    setError(null)
    try {
      await update.mutateAsync({
        id: user.id,
        input: { name: name.trim(), username: username.trim(), role },
      })
      onClose()
    } catch (reason) {
      setError(getApiErrorMessage(reason))
    }
  }
  const roleLabel = {
    ADMIN: "Administrador",
    MANAGER: "Gerente",
    OPERATOR: "Operador",
  }[role]
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={Boolean(user)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>
            Atualize os dados e a permissão de acesso.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <FormInput
            label="Nome"
            onChange={setName}
            placeholder="Nome do usuário"
            value={name}
          />
          <FormInput
            label="Usuário"
            onChange={setUsername}
            placeholder="Ex.: operador"
            value={username}
          />
          <div className="grid gap-2 text-sm font-medium">
            Função
            <Select
              onValueChange={(value) => setRole(value as UserRole)}
              value={role}
            >
              <SelectTrigger className="h-10! w-full rounded-xl! border-[#dce3de]! bg-input/50! px-2.5! py-1! text-sm shadow-none data-[size=default]:h-10! dark:border-border!">
                <span>{roleLabel}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPERATOR">Operador</SelectItem>
                <SelectItem value="MANAGER">Gerente</SelectItem>
                <SelectItem value="ADMIN">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && <p className="text-sm font-medium text-red-400">{error}</p>}
          <DialogFooter>
            <Button
              className="rounded-xl bg-[#173f31] text-white hover:bg-[#245742]"
              disabled={update.isPending}
              type="submit"
            >
              {update.isPending && (
                <LoaderCircle className="size-4 animate-spin" />
              )}
              Salvar alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
function ArchiveDialog({
  onClose,
  onConfirm,
  pending,
  user,
}: {
  onClose: () => void
  onConfirm: () => void
  pending: boolean
  user: User | null
}) {
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={Boolean(user)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Arquivar usuário?</DialogTitle>
          <DialogDescription>
            {user ? `${user.name} perderá o acesso à plataforma.` : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Cancelar
          </Button>
          <Button disabled={pending} onClick={onConfirm} variant="destructive">
            {pending && <LoaderCircle className="size-4 animate-spin" />}
            Arquivar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
