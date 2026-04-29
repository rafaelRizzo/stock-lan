"use client"

import { useState, useEffect } from "react"
import { format, parse, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

// Retorna "yyyy-MM-dd'T'HH:mm" em tempo LOCAL (sem conversão UTC)
function toLocalISO(d: Date): string {
    return format(d, "yyyy-MM-dd'T'HH:mm")
}

function parseLocal(value: string): Date | null {
    if (!value) return null
    // Tenta parsear como local ISO (sem timezone)
    const d = parse(value.slice(0, 16), "yyyy-MM-dd'T'HH:mm", new Date())
    return isValid(d) ? d : null
}

type Props = {
    value: string
    onChange: (localISO: string) => void
    disabled?: boolean
    placeholder?: string
}

export function DateTimePicker({ value, onChange, disabled, placeholder = "Selecione a data" }: Props) {
    const [open, setOpen] = useState(false)

    const date = parseLocal(value) ?? new Date()
    const hours = format(date, "HH")
    const minutes = format(date, "mm")

    useEffect(() => {
        if (!value) onChange(toLocalISO(new Date()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const updateDateTime = (newDate: Date | undefined, h: string, m: string) => {
        if (!newDate) return
        const d = new Date(newDate)
        d.setHours(Number(h) || 0, Number(m) || 0, 0, 0)
        onChange(toLocalISO(d))
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    disabled={disabled}
                    className="w-full justify-start text-left text-xs font-normal border dark:border-neutral-700"
                >
                    <CalendarIcon size={14} className="mr-2 shrink-0" />
                    {format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                sideOffset={5}
                onWheel={(e) => e.stopPropagation()}
                className="w-auto p-0"
                align="start"
            >
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => updateDateTime(d, hours, minutes)}
                    locale={ptBR}
                    captionLayout="dropdown"
                    initialFocus
                />
                <div className="flex items-center gap-2 border-t px-3 py-2">
                    <span className="text-xs text-muted-foreground">Hora:</span>
                    <Input
                        type="number"
                        min={0}
                        max={23}
                        value={hours}
                        onChange={(e) => updateDateTime(date, e.target.value.padStart(2, "0"), minutes)}
                        className="h-7 w-14 text-center text-xs"
                    />
                    <span className="text-muted-foreground">:</span>
                    <Input
                        type="number"
                        min={0}
                        max={59}
                        value={minutes}
                        onChange={(e) => updateDateTime(date, hours, e.target.value.padStart(2, "0"))}
                        className="h-7 w-14 text-center text-xs"
                    />
                </div>
            </PopoverContent>
        </Popover>
    )
}
