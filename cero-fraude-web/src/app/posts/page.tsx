
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
} from "lucide-react";

import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type CatalogItem = {
  id: number;
  name: string;
  code?: string;
};

type PostSummary = {
  id: number;
  title: string | null;
  description: string | null;
  status_id: number;
  is_fraud: boolean | null;
  published_at: string | null;
  author: string | null;
  category: number | null;
  types: number[];
};

type PaginatedPosts = {
  data: PostSummary[];
  page: number;
  total_pages: number;
  total: number;
};

const statusStyles: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  UPLOADED: "bg-amber-100 text-amber-800",
  PUBLISHED: "bg-blue-100 text-blue-800",
  VALIDATED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
};

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
  }).format(date);
}

function FraudBadge({ value }: { value: boolean | null }) {
  if (value === null) {
    return (
      <span className="text-sm text-muted-foreground">
        Sin validar
      </span>
    );
  }

  return (
    <Badge
      variant="outline"
      className={
        value
          ? "border-red-200 text-red-700"
          : "border-emerald-200 text-emerald-700"
      }
    >
      {value ? "Fraude" : "No fraude"}
    </Badge>
  );
}

export default function PostsPage() {
  const router = useRouter();

  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [states, setStates] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [types, setTypes] = useState<CatalogItem[]>([]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState("all");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [catalogError, setCatalogError] = useState(false);

  // Obtener los catálogos reales de la API.
  useEffect(() => {
    let active = true;

    async function loadCatalogs() {
      try {
        const [statesResponse, categoriesResponse, typesResponse] =
          await Promise.all([
            api.get<CatalogItem[]>("/states"),
            api.get<CatalogItem[]>("/categories"),
            api.get<CatalogItem[]>("/types"),
          ]);

        if (!active) return;

        setStates(statesResponse.data);
        setCategories(categoriesResponse.data);
        setTypes(typesResponse.data);
        setCatalogError(false);
      } catch {
        if (active) {
          setCatalogError(true);
        }
      }
    }

    void loadCatalogs();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  // Esperar un momento antes de buscar mientras se escribe.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);

    return () => clearTimeout(timeout);
  }, [search]);

  const loadPosts = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();

        params.set("page", String(page));

        if (debouncedSearch) {
          params.set("text", debouncedSearch);
        }

        if (status !== "all") {
          params.set("status_id", status);
        }

        if (category !== "all") {
          params.set("category", category);
        }

        if (type !== "all") {
          params.set("type", type);
        }

        const response = await api.get<PaginatedPosts>("/posts", {
          params,
          signal,
        });

        if (signal.aborted) return;

        setPosts(response.data.data ?? []);
        setTotalPages(Math.max(1, response.data.total_pages ?? 1));
        setTotalPosts(response.data.total ?? 0);
      } catch (err) {
        if (signal.aborted || axios.isCancel(err)) return;

        setPosts([]);
        setTotalPages(1);
        setTotalPosts(0);

        if (axios.isAxiosError(err)) {
          if (err.response?.status === 401) {
            setError("Tu sesión expiró. Inicia sesión nuevamente.");
          } else if (err.response?.status === 403) {
            setError("No tienes permisos para consultar publicaciones.");
          } else {
            setError("No fue posible obtener las publicaciones.");
          }
        } else {
          setError("Ocurrió un error al consultar el servidor.");
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [page, debouncedSearch, status, category, type]
  );

  useEffect(() => {
    const controller = new AbortController();

    void loadPosts(controller.signal);

    return () => controller.abort();
  }, [loadPosts, reloadKey]);

  const getCatalogName = (
    items: CatalogItem[],
    id: number | null
  ) => {
    if (id === null) return "Sin categoría";

    return (
      items.find((item) => item.id === id)?.name ??
      `#${id}`
    );
  };

  const getStatus = (id: number) => {
    const state = states.find((item) => item.id === id);

    return {
      label: state?.name ?? `Estado #${id}`,
      code: state?.code ?? "",
    };
  };

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setStatus("all");
    setCategory("all");
    setType("all");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Publicaciones
          </h1>
          <p className="mt-1 text-muted-foreground">
            Consulta, revisión y validación de publicaciones.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => setReloadKey((value) => value + 1)}
          disabled={loading}
        >
          <RefreshCw className="mr-2 size-4" />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-5 pt-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                aria-label="Buscar publicaciones"
                placeholder="Buscar publicaciones..."
                className="pl-9"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              disabled={catalogError}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Todos los estados
                </SelectItem>
                {states
                  .filter((state) => state.code !== "DRAFT")
                  .map((state) => (
                    <SelectItem
                      key={state.id}
                      value={String(state.id)}
                    >
                      {state.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select
              value={category}
              onValueChange={(value) => {
                setCategory(value);
                setPage(1);
              }}
              disabled={catalogError}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Todas las categorías
                </SelectItem>
                {categories.map((item) => (
                  <SelectItem
                    key={item.id}
                    value={String(item.id)}
                  >
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={type}
              onValueChange={(value) => {
                setType(value);
                setPage(1);
              }}
              disabled={catalogError}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tipo de fraude" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Todos los tipos
                </SelectItem>
                {types.map((item) => (
                  <SelectItem
                    key={item.id}
                    value={String(item.id)}
                  >
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Cargando publicaciones..."
                : `${totalPosts} publicaciones encontradas`}
            </p>

            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
            >
              Limpiar filtros
            </Button>
          </div>

          {catalogError && (
            <p className="text-sm text-amber-700">
              No se pudieron cargar los catálogos.
              Intenta actualizar la página.
            </p>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Publicación</TableHead>
                  <TableHead>Autor</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Validación</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: 7 }).map((_, cell) => (
                        <TableCell key={cell}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  posts.map((post) => {
                    const postStatus = getStatus(post.status_id);

                    return (
                      <TableRow
                        key={post.id}
                        role="link"
                        tabIndex={0}
                        aria-label={`Abrir publicación ${post.title ?? post.id}`}
                        onClick={() =>
                          router.push(`/posts/${post.id}`)
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" ||
                            event.key === " "
                          ) {
                            event.preventDefault();
                            router.push(`/posts/${post.id}`);
                          }
                        }}
                        className="cursor-pointer transition-colors hover:bg-emerald-50/50 focus-visible:outline-2 focus-visible:outline-emerald-600"
                      >
                        <TableCell className="max-w-xs font-medium">
                          <span className="block truncate">
                            {post.title || "Sin título"}
                          </span>
                          <span className="text-xs font-normal text-muted-foreground">
                            ID: {post.id}
                          </span>
                        </TableCell>

                        <TableCell>
                          {post.author || "Anónimo"}
                        </TableCell>

                        <TableCell>
                          {getCatalogName(categories, post.category)}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              statusStyles[postStatus.code] ?? ""
                            }
                          >
                            {postStatus.label}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <FraudBadge value={post.is_fraud} />
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          {formatDate(post.published_at)}
                        </TableCell>

                        <TableCell>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}

                {!loading && posts.length === 0 && !error && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-14 text-center text-muted-foreground"
                    >
                      No se encontraron publicaciones.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                aria-label="Página anterior"
                disabled={loading || page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                <ChevronLeft className="size-4" />
                Anterior
              </Button>

              <Button
                variant="outline"
                size="sm"
                aria-label="Página siguiente"
                disabled={loading || page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Siguiente
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
