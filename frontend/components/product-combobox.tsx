"use client"

import { useState } from "react"
import { ChevronsUpDown, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Product } from "@/app/hooks/useProducts"
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
    onChange: (productId: string) => void
    products: Product[]
    onSelect?: (product: Product) => void
    disabled?: boolean
}

export function ProductCombobox({ value, onChange, products, onSelect, disabled }: Props) {
    const [open, setOpen] = useState(false)
    const selected = products.find((p) => p.id === value)

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
                        <span className="text-muted-foreground">Buscar produto...</span>
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
                    <CommandInput placeholder="Buscar produto..." className="h-9 text-xs" />
                    <CommandList>
                        <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                            Nenhum produto encontrado.
                        </CommandEmpty>
                        <CommandGroup>
                            {products.map((p) => (
                                <CommandItem
                                    key={p.id}
                                    value={p.name}
                                    onSelect={() => {
                                        const newId = p.id === value ? "" : p.id
                                        onChange(newId)
                                        if (newId) onSelect?.(p)
                                        setOpen(false)
                                    }}
                                    className="text-xs"
                                >
                                    <Check
                                        size={13}
                                        className={cn("shrink-0", p.id === value ? "opacity-100" : "opacity-0")}
                                    />
                                    <span className="truncate">{p.name}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
