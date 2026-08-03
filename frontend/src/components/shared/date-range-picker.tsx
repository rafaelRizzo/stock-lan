import { CalendarDays } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DateRangePicker({
  className,
  dateFrom,
  dateTo,
  onChange,
  placeholder = "Selecione o período",
}: {
  className?: string
  dateFrom: string
  dateTo: string
  onChange: (dateFrom: string, dateTo: string) => void
  placeholder?: string
}) {
  const selected = dateFrom
    ? {
        from: parseDate(dateFrom),
        to: dateTo ? parseDate(dateTo) : parseDate(dateFrom),
      }
    : undefined

  return (
    <Popover modal>
      <PopoverTrigger
        render={
          <Button
            className={cn(
              "h-10! w-full justify-start rounded-xl! border-[#dce3de]! bg-input/50! px-3 text-left font-normal shadow-none hover:bg-input/70! sm:w-64 dark:border-border! dark:bg-input/50! dark:hover:bg-input/70!",
              !dateFrom && "text-muted-foreground",
              className
            )}
            variant="outline"
          />
        }
      >
        <CalendarDays className="mr-2 size-4 text-muted-foreground" />
        {dateFrom ? formatPeriod(dateFrom, dateTo || dateFrom) : placeholder}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          locale={ptBR}
          mode="range"
          numberOfMonths={2}
          onSelect={(range) => {
            if (!range?.from) return
            onChange(
              format(range.from, "yyyy-MM-dd"),
              format(range.to ?? range.from, "yyyy-MM-dd")
            )
          }}
          selected={selected}
        />
        <div className="flex justify-end border-t p-2">
          <PopoverClose
            render={
              <Button
                onClick={() => onChange("", "")}
                size="sm"
                variant="ghost"
              />
            }
          >
            Limpar
          </PopoverClose>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function parseDate(value: string) {
  return new Date(`${value}T12:00:00`)
}

function formatPeriod(startDate: string, endDate: string) {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  if (startDate === endDate)
    return format(start, "dd 'de' MMM 'de' yyyy", { locale: ptBR })
  const sameYear = start.getFullYear() === end.getFullYear()
  const sameMonth = sameYear && start.getMonth() === end.getMonth()
  const startFormat = sameMonth
    ? "dd"
    : sameYear
      ? "dd 'de' MMM"
      : "dd 'de' MMM 'de' yyyy"
  return `${format(start, startFormat, { locale: ptBR })} a ${format(end, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}`
}
