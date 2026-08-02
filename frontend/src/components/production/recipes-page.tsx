import { useEffect, useState, type FormEvent } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LoaderCircle,
  Minus,
  Plus,
  Search,
  Settings2,
} from "lucide-react"
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
import { useProducts } from "@/hooks/products/use-products"
import { useRecipe, useReplaceRecipe } from "@/hooks/production/use-recipes"
import { DEFAULT_PAGE_SIZE } from "@/lib/constants"
import { getApiErrorMessage } from "@/lib/http"
import type { Product } from "@/services/products.service"

const pageSize = DEFAULT_PAGE_SIZE
const selectClass =
  "h-10! w-full rounded-xl! border-[#dce3de]! bg-input/50! px-2.5! py-1! text-sm shadow-none data-[size=default]:h-10! dark:border-border!"

export function RecipesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [recipeTarget, setRecipeTarget] = useState<Product | null>(null)
  const products = useProducts({
    page,
    limit: pageSize,
    search: search || undefined,
    status: "ACTIVE",
  })
  const finishedProducts = products.data?.data.filter(
    (product) => product.type !== "RAW_MATERIAL"
  )

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ClipboardList className="size-4" /> Produção
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
            Receitas
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Defina os insumos necessários para produzir cada produto final.
          </p>
        </div>
      </div>
      <section className="rounded-2xl border border-[#e5e9e4] bg-background dark:border-border">
        <div className="flex flex-col gap-3 border-b border-[#e5e9e4] p-4 sm:flex-row sm:items-center dark:border-border">
          <div className="relative w-full sm:w-[28rem]">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 rounded-xl pl-9 shadow-none"
              placeholder="Buscar produto final"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">Produto final</TableHead>
              <TableHead className="w-14" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.isLoading ? (
              <TableSkeletonRows
                columns={[
                  { className: "py-3 pl-5", width: "w-48" },
                  { variant: "icon" },
                ]}
              />
            ) : (
              finishedProducts?.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="py-3 pl-5 font-medium">
                    {product.name}
                  </TableCell>
                  <TableCell>
                    <Button
                      aria-label={`Gerenciar receita de ${product.name}`}
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setRecipeTarget(product)}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <Settings2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
            {!products.isLoading && finishedProducts?.length === 0 && (
              <TableRow>
                <TableCell
                  className="h-52 text-center text-muted-foreground"
                  colSpan={2}
                >
                  Nenhum produto final ou de uso misto encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Pagination data={products.data} page={page} setPage={setPage} />
      </section>
      <RecipeDialog
        onClose={() => setRecipeTarget(null)}
        product={recipeTarget}
      />
    </div>
  )
}

type DraftItem = { rawProductId: string; quantityPerUnit: string }
function RecipeDialog({
  product,
  onClose,
}: {
  product: Product | null
  onClose: () => void
}) {
  const [items, setItems] = useState<DraftItem[]>([
    { rawProductId: "", quantityPerUnit: "" },
  ])
  const [error, setError] = useState<string | null>(null)
  const rawMaterials = useProducts({ page: 1, limit: 100, status: "ACTIVE" })
  const recipe = useRecipe(product?.id)
  const replaceRecipe = useReplaceRecipe()
  const sellableRawMaterials = rawMaterials.data?.data.filter(
    (candidate) => candidate.type !== "FINISHED"
  )
  useEffect(() => {
    if (product && recipe.data)
      setItems(
        recipe.data.length
          ? recipe.data.map((item) => ({
              rawProductId: item.rawProductId,
              quantityPerUnit: String(item.quantityPerUnit).replace(".", ","),
            }))
          : [{ rawProductId: "", quantityPerUnit: "" }]
      )
    setError(null)
  }, [product, recipe.data])
  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index ? { ...item, ...patch } : item
      )
    )
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!product) return
    const payloadItems = items.map((item) => ({
      rawProductId: item.rawProductId,
      quantityPerUnit: Number(item.quantityPerUnit.replace(",", ".")),
    }))
    if (
      payloadItems.some(
        (item) =>
          !item.rawProductId ||
          !Number.isFinite(item.quantityPerUnit) ||
          item.quantityPerUnit <= 0
      )
    )
      return setError("Informe insumo e quantidade válida em todos os itens.")
    try {
      await replaceRecipe.mutateAsync({
        finishedProductId: product.id,
        items: payloadItems,
      })
      onClose()
    } catch (cause) {
      setError(getApiErrorMessage(cause))
    }
  }
  return (
    <Dialog open={Boolean(product)} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Receita de {product?.name}</DialogTitle>
          <DialogDescription>
            Defina os insumos e a quantidade necessária para produzir uma
            unidade.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="rounded-xl border border-border p-3">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium">Insumos</p>
              <Button
                className="rounded-lg"
                onClick={() =>
                  setItems((current) => [
                    ...current,
                    { rawProductId: "", quantityPerUnit: "" },
                  ])
                }
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus className="size-3.5" /> Adicionar
              </Button>
            </div>
            <div className="space-y-3">
              <div className="hidden gap-2 px-0.5 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[1fr_140px_32px]">
                <span>Insumo</span>
                <span>Qtd. por unidade</span>
                <span />
              </div>
              {items.map((item, index) => {
                const selected = sellableRawMaterials?.find(
                  (candidate) => candidate.id === item.rawProductId
                )
                return (
                  <div
                    className="grid gap-2 sm:grid-cols-[1fr_140px_32px]"
                    key={index}
                  >
                    <Select
                      onValueChange={(value) =>
                        updateItem(index, { rawProductId: value ?? "" })
                      }
                      value={item.rawProductId}
                    >
                      <SelectTrigger className={selectClass}>
                        <span>{selected?.name || "Selecione o insumo"}</span>
                      </SelectTrigger>
                      <SelectContent>
                        {sellableRawMaterials?.map((candidate) => (
                          <SelectItem key={candidate.id} value={candidate.id}>
                            {candidate.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      aria-label="Quantidade por unidade"
                      className="h-10 rounded-xl"
                      inputMode="decimal"
                      onChange={(event) =>
                        updateItem(index, {
                          quantityPerUnit: event.target.value
                            .replace(/[^0-9,]/g, "")
                            .replace(/(,.*),/g, "$1"),
                        })
                      }
                      placeholder="Ex.: 0,2"
                      value={item.quantityPerUnit}
                    />
                    <Button
                      aria-label="Remover insumo"
                      className="self-center"
                      disabled={items.length === 1}
                      onClick={() =>
                        setItems((current) =>
                          current.filter(
                            (_, currentIndex) => currentIndex !== index
                          )
                        )
                      }
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <Minus className="size-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
          {error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              className="rounded-xl bg-[#173f31] text-white hover:bg-[#245742]"
              disabled={replaceRecipe.isPending}
              type="submit"
            >
              {replaceRecipe.isPending && (
                <LoaderCircle className="size-4 animate-spin" />
              )}{" "}
              Salvar receita
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Pagination({
  data,
  page,
  setPage,
}: {
  data?: { total: number; totalPage: number }
  page: number
  setPage: (page: number) => void
}) {
  return (
    <div className="flex items-center justify-between border-t border-[#e5e9e4] px-4 py-3 text-sm text-muted-foreground dark:border-border">
      <span>{data?.total ?? 0} produtos</span>
      <div className="flex items-center gap-2">
        <Button
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          size="icon-sm"
          variant="outline"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span>
          Página {page} de {data?.totalPage ?? 1}
        </span>
        <Button
          disabled={page >= (data?.totalPage ?? 1)}
          onClick={() => setPage(page + 1)}
          size="icon-sm"
          variant="outline"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
