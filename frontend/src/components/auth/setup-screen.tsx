import { useState, type FormEvent, type ReactNode } from "react"
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  PackageCheck,
  UserRound,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { useInitialSetup } from "@/hooks/auth/use-initial-setup"
import { getApiErrorMessage } from "@/lib/http"

export function SetupScreen() {
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setup, isPending } = useInitialSetup()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!name.trim() || !username.trim() || !password) {
      setError("Preencha todos os campos.")
      return
    }

    if (username.trim().length < 3) {
      setError("O usuário precisa ter pelo menos 3 caracteres.")
      return
    }

    if (password.length < 12) {
      setError("A senha precisa ter pelo menos 12 caracteres.")
      return
    }

    if (password !== confirmation) {
      setError("As senhas não conferem.")
      return
    }

    setError(null)

    try {
      await setup({ name: name.trim(), username: username.trim(), password })
    } catch (reason) {
      setError(getApiErrorMessage(reason))
    }
  }

  return (
    <main className="min-h-svh bg-[#f7f8f6] p-3 text-[#18231f] sm:p-5 lg:p-7 dark:bg-background dark:text-foreground">
      <div className="mx-auto grid min-h-[calc(100svh-1.5rem)] max-w-[1440px] overflow-hidden rounded-[2rem] border border-[#e5e9e4] bg-white shadow-[0_24px_80px_-38px_rgba(25,49,36,0.36)] lg:h-[calc(100svh-3.5rem)] lg:min-h-0 lg:grid-cols-[0.93fr_1.07fr] dark:border-border dark:bg-card">
        <section className="flex flex-col px-6 py-7 sm:px-10 sm:py-9 lg:overflow-y-auto lg:px-14 lg:py-10 xl:px-20">
          <a
            className="flex w-fit items-center gap-3"
            href="/"
            aria-label="Stock LAN"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-[#173f31] text-white shadow-lg shadow-[#173f31]/15">
              <PackageCheck className="size-5" strokeWidth={2.4} />
            </span>
            <span className="text-base font-semibold tracking-[-0.03em]">
              Stock LAN
            </span>
          </a>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10 lg:py-6">
            <div className="mb-7">
              <span className="inline-flex rounded-full bg-[#eaf4ec] px-3 py-1 text-xs font-semibold tracking-wide text-[#296148]">
                CONFIGURAÇÃO INICIAL
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.045em] sm:text-[2.15rem]">
                Crie sua conta principal
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-[#68756f] dark:text-muted-foreground">
                Esta conta terá acesso de administrador para configurar a
                operação.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <FormField label="Seu nome" htmlFor="name">
                <UserRound className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#829089]" />
                <input
                  autoComplete="name"
                  className="setup-input pl-11"
                  disabled={isPending}
                  id="name"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Ex.: Administrador do sistema"
                  value={name}
                />
              </FormField>

              <FormField label="Usuário" htmlFor="username">
                <UserRound className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#829089]" />
                <input
                  autoComplete="username"
                  className="setup-input pl-11"
                  disabled={isPending}
                  id="username"
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Ex.: rafael"
                  value={username}
                />
              </FormField>

              <FormField label="Senha" htmlFor="password">
                <LockKeyhole className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#829089]" />
                <input
                  autoComplete="new-password"
                  className="setup-input px-11"
                  disabled={isPending}
                  id="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo de 12 caracteres"
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <PasswordToggle
                  isVisible={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                />
              </FormField>

              <FormField label="Confirmar senha" htmlFor="confirmation">
                <LockKeyhole className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#829089]" />
                <input
                  autoComplete="new-password"
                  className="setup-input px-11"
                  disabled={isPending}
                  id="confirmation"
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder="Repita sua senha"
                  type={showPassword ? "text" : "password"}
                  value={confirmation}
                />
              </FormField>

              {error && (
                <p
                  className="flex items-center gap-2 px-1 text-sm font-medium text-red-400"
                  role="alert"
                >
                  <AlertCircle className="size-4 shrink-0" />
                  {error}
                </p>
              )}

              <Button
                className="h-12 w-full rounded-xl bg-[#173f31] text-sm font-semibold text-white shadow-[0_10px_20px_-12px_rgba(23,63,49,0.8)] hover:bg-[#245742]"
                disabled={isPending}
                type="submit"
              >
                {isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  "Concluir configuração"
                )}
                {!isPending && <ArrowRight className="size-4" />}
              </Button>
            </form>
          </div>

          <p className="text-xs text-[#98a39e]">
            © {new Date().getFullYear()} Stock LAN
          </p>
        </section>

        <aside className="relative hidden overflow-hidden bg-[#163f31] p-12 text-white lg:flex lg:flex-col xl:p-16">
          <div className="absolute -top-24 -right-20 size-80 rounded-full border border-white/10" />
          <div className="absolute -right-24 -bottom-32 size-96 rounded-full border border-white/10" />
          <div className="relative max-w-md">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium tracking-wide text-[#d4e5d7]">
              PRIMEIRO ACESSO
            </span>
            <h2 className="mt-8 text-4xl leading-[1.08] font-semibold tracking-[-0.05em] xl:text-5xl">
              Sua operação começa aqui.
            </h2>
            <p className="mt-5 max-w-sm text-[15px] leading-7 text-[#b8ccc0]">
              Defina o administrador inicial e deixe o Stock LAN pronto para o
              dia a dia.
            </p>
          </div>
          <div className="relative mt-auto rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur-sm">
            <strong className="text-sm font-semibold">
              Acesso administrativo
            </strong>
            <p className="mt-2 text-sm leading-6 text-[#b8ccc0]">
              Cadastre usuários, produtos, estoque e permissões após a
              configuração.
            </p>
          </div>
        </aside>
      </div>
    </main>
  )
}

function FormField({
  children,
  htmlFor,
  label,
}: {
  children: ReactNode
  htmlFor: string
  label: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor={htmlFor}>
        {label}
      </label>
      <div className="relative">{children}</div>
    </div>
  )
}

function PasswordToggle({
  isVisible,
  onClick,
}: {
  isVisible: boolean
  onClick: () => void
}) {
  return (
    <button
      aria-label={isVisible ? "Ocultar senha" : "Mostrar senha"}
      className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-[#829089] transition-colors hover:bg-[#edf3ef] hover:text-[#315e4d]"
      onClick={onClick}
      type="button"
    >
      {isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  )
}
