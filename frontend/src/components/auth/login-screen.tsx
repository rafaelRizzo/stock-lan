import { useState, type FormEvent } from "react"
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  PackageCheck,
  UserRound,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getApiErrorMessage } from "@/lib/http"
import { useLogin } from "@/hooks/auth/use-login"

export function LoginScreen() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login, isPending } = useLogin()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!username.trim() || !password) {
      setError("Informe seu usuário e senha.")
      return
    }

    setError(null)
    try {
      await login({ username: username.trim(), password })
    } catch (reason) {
      setError(getApiErrorMessage(reason))
    }
  }

  return (
    <main className="min-h-svh bg-[#f7f8f6] p-3 text-[#18231f] sm:p-5 lg:p-7 dark:bg-background dark:text-foreground">
      <div className="mx-auto grid min-h-[calc(100svh-1.5rem)] max-w-[1440px] overflow-hidden rounded-[2rem] border border-[#e5e9e4] bg-white shadow-[0_24px_80px_-38px_rgba(25,49,36,0.36)] lg:min-h-[calc(100svh-3.5rem)] lg:grid-cols-[0.95fr_1.05fr] dark:border-border dark:bg-card">
        <section className="flex flex-col px-6 py-7 sm:px-10 sm:py-9 lg:px-14 lg:py-12 xl:px-20">
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

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-14 lg:py-8">
            <div className="mb-9">
              <p className="mb-3 text-sm font-medium text-[#658074] dark:text-muted-foreground">
                Bem-vindo de volta
              </p>
              <h1 className="text-3xl font-semibold tracking-[-0.045em] sm:text-[2.15rem]">
                Acesse sua operação
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-[#68756f] dark:text-muted-foreground">
                Entre para acompanhar seu estoque, vendas e movimentações.
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="username">
                  Usuário
                </label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#829089]" />
                  <Input
                    autoComplete="username"
                    className="h-12 rounded-xl border-[#dce3de] bg-[#fbfcfb] pl-11 text-sm shadow-none dark:border-border dark:bg-background"
                    disabled={isPending}
                    id="username"
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Seu usuário"
                    value={username}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password">
                  Senha
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#829089]" />
                  <Input
                    autoComplete="current-password"
                    className="h-12 rounded-xl border-[#dce3de] bg-[#fbfcfb] px-11 text-sm shadow-none dark:border-border dark:bg-background"
                    disabled={isPending}
                    id="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Sua senha"
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    aria-label={
                      showPassword ? "Ocultar senha" : "Mostrar senha"
                    }
                    className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-[#829089] transition-colors hover:bg-[#edf3ef] hover:text-[#315e4d]"
                    disabled={isPending}
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

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
                  "Entrar na plataforma"
                )}
                {!isPending && <ArrowRight className="size-4" />}
              </Button>
            </form>

            <p className="mt-8 flex items-center justify-center gap-2 text-xs text-[#829089] dark:text-muted-foreground">
              <KeyRound className="size-3.5" /> Sessão segura e protegida
            </p>
          </div>

          <p className="text-xs text-[#98a39e]">
            © {new Date().getFullYear()} Stock LAN
          </p>
        </section>

        <aside className="relative hidden overflow-hidden bg-[#163f31] p-12 text-white lg:flex lg:flex-col xl:p-16">
          <div className="absolute -top-24 -right-20 size-80 rounded-full border border-white/10" />
          <div className="absolute -right-24 -bottom-32 size-96 rounded-full border border-white/10" />
          <div className="absolute top-1/2 right-16 size-2 rounded-full bg-[#a8d5b5] shadow-[0_0_28px_11px_rgba(168,213,181,0.26)]" />

          <div className="relative max-w-md">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium tracking-wide text-[#d4e5d7]">
              GESTÃO INTELIGENTE
            </span>
            <h2 className="mt-8 text-4xl leading-[1.08] font-semibold tracking-[-0.05em] xl:text-5xl">
              Controle total, decisões melhores.
            </h2>
            <p className="mt-5 max-w-sm text-[15px] leading-7 text-[#b8ccc0]">
              Centralize a rotina do seu negócio em uma operação simples, rápida
              e confiável.
            </p>
          </div>

          <div className="relative mt-auto grid grid-cols-2 gap-3">
            <Metric value="24h" label="Operação contínua" />
            <Metric value="100%" label="Visão do estoque" />
          </div>
        </aside>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
      <strong className="block text-2xl font-semibold tracking-[-0.04em]">
        {value}
      </strong>
      <span className="mt-1 block text-xs text-[#b8ccc0]">{label}</span>
    </div>
  )
}
