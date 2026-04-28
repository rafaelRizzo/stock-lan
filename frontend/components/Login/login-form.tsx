// app/components/LoginForm.tsx
"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useLoginForm } from "@/app/hooks/useLoginForm"

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"form">) {
    const { register, onSubmit, formState } = useLoginForm()
    const { errors, isSubmitting } = formState

    return (
        <form
            onSubmit={onSubmit}
            className={cn("flex flex-col gap-6", className)}
            {...props}
        >
            <FieldGroup>
                <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="text-2xl font-bold">Entre com sua conta</h1>
                    <p className="text-sm text-muted-foreground">
                        Entre com o seu email e senha abaixo
                    </p>
                </div>

                <Field>
                    <FieldLabel htmlFor="username">Email</FieldLabel>
                    <Input
                        id="username"
                        {...register("username", { required: "Email obrigatório" })}
                    />
                    {errors.username && (
                        <span className="text-xs text-red-500">
                            {errors.username.message}
                        </span>
                    )}
                </Field>

                <Field>
                    <FieldLabel htmlFor="password">Senha</FieldLabel>
                    <Input
                        id="password"
                        type="password"
                        {...register("password", { required: "Senha obrigatória" })}
                    />
                    {errors.password && (
                        <span className="text-xs text-red-500">
                            {errors.password.message}
                        </span>
                    )}
                </Field>

                <Field>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Entrando..." : "Login"}
                    </Button>
                </Field>

                <FieldSeparator />

                <Field>
                    <FieldDescription className="text-center">
                        Mantido por{" "}
                        <a href="https://github.com/rafaelRizzo" target="_blank">
                            Rafael Rizzo
                        </a>
                    </FieldDescription>
                </Field>
            </FieldGroup>
        </form>
    )
}