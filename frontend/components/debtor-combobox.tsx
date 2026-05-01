"use client"

import { useState } from "react"
import { ChevronsUpDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Debtor } from "@/app/hooks/useDebtors"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

type Props = {
    value: string
    onChange: (debtorId: string) => void
    debtors: Debtor[]
    disabled?: boolean
}

export function DebtorCombobox({ value, onChange, debtors, disabled }: Props) {
    const [open, setOpen] = useState(false)
    const selected = debtors.find((d) => d.id === value)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    disabled={disabled}
                    className="w-full justify-between text-xs border dark:border-neutral-700"
                >
                    {selected ? (
                        selected.name
                    ) : (
                        <span className="text-muted-foreground">Buscar devedor...</span>
                    )}
                    <ChevronsUpDown size={14} className="ml-2 shrink-0 text-muted-foreground" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                sideOffset={5}
                onWheel={(e) => e.stopPropagation()}
                className="p-0 max-h-72 overflow-auto"
                style={{ width: "var(--radix-popper-anchor-width)" }}
                align="start"
            >
                <Command>
                    <CommandInput placeholder="Buscar devedor..." className="h-9 text-xs" />
                    <CommandList>
                        <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                            Nenhum devedor encontrado.
                        </CommandEmpty>
                        <CommandGroup>
                            {debtors.map((d) => (
                                <CommandItem
                                    key={d.id}
                                    value={d.name}
                                    onSelect={() => {
                                        onChange(d.id === value ? "" : d.id)
                                        setOpen(false)
                                    }}
                                    className="text-xs"
                                >
                                    <Check
                                        size={13}
                                        className={cn("shrink-0", d.id === value ? "opacity-100" : "opacity-0")}
                                    />
                                    <div className="flex flex-col">
                                        <span className="truncate">{d.name}</span>
                                        {d.phone && <span className="text-muted-foreground">{d.phone}</span>}
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
