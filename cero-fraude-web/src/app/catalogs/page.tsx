
"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  code?: string | null;
  description?: string | null;
};

type CatalogKey =
  | "categories"
  | "types"
  | "states"
  | "report-reasons"
  | "evidence-types"
  | "authorities";

// Present only on catalogs that can be created from the panel. Length
// limits mirror the backend DTOs (and the VARCHAR sizes in schema.sql).
type CreateConfig = {
  buttonLabel: string;
  successMessage: string;
  namePlaceholder: string;
  codePlaceholder: string;
  nameMaxLength: number;
  codeMaxLength: number;
  requiresDescription: boolean;
};

type CatalogConfig = {
  key: CatalogKey;
  label: string;
  singular: string;
  endpoint: string;
  create?: CreateConfig;
};

const AUTHORITY_DESCRIPTION_MAX_LENGTH = 255;

const catalogs: CatalogConfig[] = [
  {
    key: "categories",
    label: "Categorías",
    singular: "categoría",
    endpoint: "/categories",
    create: {
      buttonLabel: "Agregar categoría",
      successMessage: "Categoría agregada correctamente",
      namePlaceholder: "Ej. Redes sociales",
      codePlaceholder: "Ej. SOCIAL",
      nameMaxLength: 20,
      codeMaxLength: 11,
      requiresDescription: false,
    },
  },
  {
    key: "types",
    label: "Tipos de fraude",
    singular: "tipo de fraude",
    endpoint: "/types",
    create: {
      buttonLabel: "Agregar tipo de fraude",
      successMessage: "Tipo de fraude agregado correctamente",
      namePlaceholder: "Ej. Promoción falsa",
      codePlaceholder: "Ej. FAKE_PROMO",
      nameMaxLength: 50,
      codeMaxLength: 11,
      requiresDescription: false,
    },
  },
  {
    key: "states",
    label: "Estados",
    singular: "estado",
    endpoint: "/states",
  },
  {
    key: "report-reasons",
    label: "Motivos de reporte",
    singular: "motivo de reporte",
    endpoint: "/report-reasons",
  },
  {
    key: "evidence-types",
    label: "Tipos de evidencia",
    singular: "tipo de evidencia",
    endpoint: "/evidence-types",
  },
  {
    key: "authorities",
    label: "Autoridades",
    singular: "autoridad",
    endpoint: "/authorities",
    create: {
      buttonLabel: "Agregar autoridad",
      successMessage: "Autoridad agregada correctamente",
      namePlaceholder: "Ej. CONDUSEF",
      codePlaceholder: "Ej. CONDUSEF",
      nameMaxLength: 100,
      codeMaxLength: 11,
      requiresDescription: true,
    },
  },
];

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (typeof message === "string") {
      return message;
    }

    if (Array.isArray(message)) {
      return message.join(", ");
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrió un error inesperado.";
}

export default function CatalogsPage() {
  const [selected, setSelected] = useState<CatalogKey>("categories");

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const currentCatalog = catalogs.find(
    (catalog) => catalog.key === selected
  )!;
  const createConfig = currentCatalog.create;

  const canSubmitCreate =
    !saving &&
    name.trim() !== "" &&
    code.trim() !== "" &&
    (!createConfig?.requiresDescription || description.trim() !== "");

  const hasDescription = selected === "authorities";

  const hasCode = items.some(
    (item) => item.code != null
  );

  const columnCount =
    2 + Number(hasCode) + Number(hasDescription);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCatalog() {
      setLoading(true);
      setError(null);
      setItems([]);

      try {
        const response = await api.get<CatalogItem[]>(
          currentCatalog.endpoint,
          {
            signal: controller.signal,
          }
        );

        if (controller.signal.aborted) return;

        if (!Array.isArray(response.data)) {
          throw new Error(
            "El backend devolvió un formato de catálogo inesperado."
          );
        }

        setItems(response.data);
      } catch (error) {
        if (
          controller.signal.aborted ||
          axios.isCancel(error)
        ) {
          return;
        }

        setItems([]);
        setError(getErrorMessage(error));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => controller.abort();
  }, [currentCatalog.endpoint, refreshKey]);

  function refreshCatalog() {
    setRefreshKey((current) => current + 1);
  }

  function changeCatalog(value: string) {
    setSelected(value as CatalogKey);
    setCreateOpen(false);
    setCreateError(null);
  }

  function openCreateDialog() {
    if (!createConfig) return;

    setName("");
    setCode("");
    setDescription("");
    setCreateError(null);
    setCreateOpen(true);
  }

  function closeCreateDialog() {
    if (saving) return;

    setCreateOpen(false);
    setCreateError(null);
  }

  async function createCatalogItem() {
    if (!createConfig || saving) return;

    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    const trimmedDescription = description.trim();

    if (
      !trimmedName ||
      !trimmedCode ||
      (createConfig.requiresDescription && !trimmedDescription)
    ) {
      setCreateError(
        createConfig.requiresDescription
          ? "Completa el nombre, el código y la descripción."
          : "Completa el nombre y el código."
      );
      return;
    }

    setSaving(true);
    setCreateError(null);

    try {
      await api.post(currentCatalog.endpoint, {
        name: trimmedName,
        code: trimmedCode,
        // Only authorities have a description column.
        ...(createConfig.requiresDescription && {
          description: trimmedDescription,
        }),
      });

      toast.success(createConfig.successMessage);

      setCreateOpen(false);
      setName("");
      setCode("");
      setDescription("");

      refreshCatalog();
    } catch (error) {
      const message = getErrorMessage(error);

      setCreateError(message);
      toast.error("No se pudo agregar el registro");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Catálogos y autoridades
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Consulta y administra los catálogos de Cero Fraude.
          </p>
        </div>

        <Button
          variant="outline"
          disabled={loading}
          onClick={refreshCatalog}
        >
          <RefreshCw
            className={`mr-2 size-4 ${
              loading ? "animate-spin" : ""
            }`}
          />
          Actualizar
        </Button>
      </div>

      <Tabs
        value={selected}
        onValueChange={changeCatalog}
      >
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          {catalogs.map((catalog) => (
            <TabsTrigger
              key={catalog.key}
              value={catalog.key}
            >
              {catalog.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selected} className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle>
                    {currentCatalog.label}
                  </CardTitle>

                  <CardDescription>
                    {createConfig
                      ? "Consulta los registros y agrega nuevos elementos."
                      : "Catálogo de consulta. Sus registros no se modifican desde este panel."}
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!loading && !error && (
                    <Badge variant="secondary">
                      {items.length} registros
                    </Badge>
                  )}

                  {createConfig && (
                    <Button
                      size="sm"
                      onClick={openCreateDialog}
                    >
                      <Plus className="mr-2 size-4" />
                      {createConfig.buttonLabel}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {error ? (
                <div className="space-y-3 rounded-lg border p-5">
                  <p
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {error}
                  </p>

                  <Button
                    variant="outline"
                    onClick={refreshCatalog}
                  >
                    Reintentar
                  </Button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">
                          ID
                        </TableHead>

                        <TableHead>
                          Nombre
                        </TableHead>

                        {hasCode && (
                          <TableHead>
                            Código
                          </TableHead>
                        )}

                        {hasDescription && (
                          <TableHead>
                            Descripción
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {loading ? (
                        Array.from({ length: 4 }).map(
                          (_, index) => (
                            <TableRow key={index}>
                              {Array.from({
                                length: columnCount,
                              }).map((_, cell) => (
                                <TableCell key={cell}>
                                  <Skeleton className="h-5 w-full max-w-40" />
                                </TableCell>
                              ))}
                            </TableRow>
                          )
                        )
                      ) : items.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={columnCount}
                            className="py-12 text-center text-sm text-muted-foreground"
                          >
                            No hay registros disponibles.
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.id}
                            </TableCell>

                            <TableCell>
                              {item.name}
                            </TableCell>

                            {hasCode && (
                              <TableCell className="text-muted-foreground">
                                {item.code ?? "—"}
                              </TableCell>
                            )}

                            {hasDescription && (
                              <TableCell className="text-muted-foreground">
                                {item.description ?? "—"}
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeCreateDialog();
          }
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          showCloseButton={!saving}
          onInteractOutside={(event) => {
            if (saving) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (saving) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              Agregar {currentCatalog.singular}
            </DialogTitle>

            <DialogDescription>
              Registra un nuevo elemento en el catálogo.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void createCatalogItem();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="catalog-name">
                Nombre
              </Label>

              <Input
                id="catalog-name"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder={createConfig?.namePlaceholder}
                required
                disabled={saving}
                maxLength={createConfig?.nameMaxLength}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="catalog-code">
                Código
              </Label>

              <Input
                id="catalog-code"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.toUpperCase())
                }
                placeholder={createConfig?.codePlaceholder}
                required
                disabled={saving}
                maxLength={createConfig?.codeMaxLength}
              />

              <p className="text-xs text-muted-foreground">
                Identificador del catálogo. Utiliza letras,
                números y guiones bajos (máximo{" "}
                {createConfig?.codeMaxLength} caracteres).
              </p>
            </div>

            {createConfig?.requiresDescription && (
              <div className="space-y-2">
                <Label htmlFor="catalog-description">
                  Descripción
                </Label>

                <Textarea
                  id="catalog-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Ej. Orienta en asuntos relacionados con instituciones financieras."
                  required
                  disabled={saving}
                  maxLength={AUTHORITY_DESCRIPTION_MAX_LENGTH}
                  rows={3}
                />

                <p className="text-right text-xs text-muted-foreground">
                  {description.length}/{AUTHORITY_DESCRIPTION_MAX_LENGTH}
                </p>
              </div>
            )}

            {createError && (
              <p
                role="alert"
                className="text-sm text-destructive"
              >
                {createError}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={closeCreateDialog}
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={!canSubmitCreate}
              >
                {saving
                  ? "Guardando..."
                  : "Agregar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
