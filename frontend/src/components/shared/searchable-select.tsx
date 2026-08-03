import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox"

export type SearchableSelectOption = { value: string; label: string }

export function SearchableSelect({
  className,
  disabled,
  emptyText = "Nenhum resultado.",
  items,
  onValueChange,
  placeholder = "Buscar...",
  value,
}: {
  className?: string
  disabled?: boolean
  emptyText?: string
  items: SearchableSelectOption[]
  onValueChange: (value: string) => void
  placeholder?: string
  value: string
}) {
  const selected = items.find((item) => item.value === value) ?? null
  const anchor = useComboboxAnchor()
  return (
    <Combobox
      autoHighlight
      disabled={disabled}
      items={items}
      itemToStringValue={(item: SearchableSelectOption) => item.value}
      onValueChange={(next: SearchableSelectOption | null) =>
        onValueChange(next?.value ?? "")
      }
      value={selected}
    >
      <ComboboxInput
        anchorRef={anchor}
        placeholder={placeholder}
        className={className}
      />
      <ComboboxContent
        anchor={anchor}
        collisionBoundary={
          typeof document === "undefined" ? undefined : document.body
        }
      >
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(item: SearchableSelectOption) => (
            <ComboboxItem key={item.value} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
