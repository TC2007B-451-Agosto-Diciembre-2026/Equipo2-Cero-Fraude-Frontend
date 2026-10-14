
"use client";

import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Clock3,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  BarChart3,
} from "lucide-react";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type PostStatus = {
  id: number;
  code: string;
  name: string;
};

type PostSummary = {
  id: number;
  status_id: number;
  is_fraud: boolean | number | null;
};

type PostsResponse = {
  data: PostSummary[];
  page: number;
  total_pages: number;
  total: number;
};

type Statistics = {
  uploaded: number;
  published: number;
  validated: number;
  rejected: number;
  fraud: number;
  notFraud: number;
  unclassified: number;
};

const statusCodes = [
  "UPLOADED",
  "PUBLISHED",
  "VALIDATED",
  "REJECTED",
] as const;

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(", ");
  }

  if (error instanceof Error) return error.message;

  return "No fue posible obtener las estadísticas.";
}

export default function StatisticsPage() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadStatistics = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const statesResponse = await api.get<PostStatus[]>(
        "/states",
        { signal }
      );

      const states = statesResponse.data;

      const statusIds = Object.fromEntries(
        states.map((state) => [state.code, state.id])
      ) as Record<string, number>;

      for (const code of statusCodes) {
        if (statusIds[code] === undefined) {
          throw new Error(
            `No se encontró el estado ${code} en el catálogo.`
          );
        }
      }

      async function fetchPage(statusId: number, page: number) {
        const response = await api.get<PostsResponse>("/posts", {
          params: {
            page,
            status_id: statusId,
          },
          signal,
        });

        return response.data;
      }

      // Consulta la primera página de cada estado.
      // "total" permite contar sin descargar todos sus registros.
      const [uploaded, published, validated, rejected] =
        await Promise.all([
          fetchPage(statusIds.UPLOADED, 1),
          fetchPage(statusIds.PUBLISHED, 1),
          fetchPage(statusIds.VALIDATED, 1),
          fetchPage(statusIds.REJECTED, 1),
        ]);

      // Para distinguir fraude/no fraude necesitamos leer
      // todas las publicaciones validadas.
      const validatedPosts: PostSummary[] = [...validated.data];

      const totalValidatedPages = Math.max(
        1,
        validated.total_pages
      );

      // Consultas en grupos para evitar demasiadas peticiones
      // simultáneas cuando existan muchas publicaciones.
      for (let start = 2; start <= totalValidatedPages; start += 5) {
        const end = Math.min(
          start + 4,
          totalValidatedPages
        );

        const pageNumbers = Array.from(
          { length: end - start + 1 },
          (_, index) => start + index
        );

        const pages = await Promise.all(
          pageNumbers.map((page) =>
            fetchPage(statusIds.VALIDATED, page)
          )
        );

        for (const result of pages) {
          validatedPosts.push(...result.data);
        }
      }

      if (signal.aborted) return;

      const fraud = validatedPosts.filter(
        (post) => post.is_fraud === true || post.is_fraud === 1
      ).length;

      const notFraud = validatedPosts.filter(
        (post) => post.is_fraud === false || post.is_fraud === 0
      ).length;

      const unclassified =
        validatedPosts.length - fraud - notFraud;

      setStatistics({
        uploaded: uploaded.total,
        published: published.total,
        validated: validated.total,
        rejected: rejected.total,
        fraud,
        notFraud,
        unclassified,
      });
    } catch (error) {
      if (signal.aborted || axios.isCancel(error)) return;

      setStatistics(null);
      setError(getErrorMessage(error));
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void loadStatistics(controller.signal);

    return () => controller.abort();
  }, [loadStatistics, refreshKey]);

  const metrics = statistics
    ? [
        {
          title: "Pendientes de revisión",
          value: statistics.uploaded,
          description: "Publicaciones subidas",
          icon: Clock3,
        },
        {
          title: "Pendientes de validación",
          value: statistics.published,
          description: "Publicaciones pendientes de validar",
          icon: ShieldAlert,
        },
        {
          title: "Fraudes confirmados",
          value: statistics.fraud,
          description: "Validadas como fraude",
          icon: ShieldCheck,
        },
        {
          title: "Validadas como no fraude",
          value: statistics.notFraud,
          description: "Validadas sin fraude",
          icon: CheckCircle2,
        },
      ]
    : [];

  const moderationData = statistics
    ? [
        {
          label: "Pendientes de revisión",
          value: statistics.uploaded,
        },
        {
          label: "Pendientes de validación",
          value: statistics.published,
        },
        {
          label: "Validadas",
          value: statistics.validated,
        },
        {
          label: "Rechazadas",
          value: statistics.rejected,
        },
      ]
    : [];

  const maxModerationValue = Math.max(
    1,
    ...moderationData.map((item) => item.value)
  );

  const classifiedTotal = statistics
    ? statistics.fraud + statistics.notFraud
    : 0;

  const fraudPercentage =
    statistics && classifiedTotal > 0
      ? (statistics.fraud / classifiedTotal) * 100
      : 0;

  const notFraudPercentage =
    statistics && classifiedTotal > 0
      ? (statistics.notFraud / classifiedTotal) * 100
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Estadísticas
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Seguimiento de publicaciones y resultados de moderación.
          </p>
        </div>

        <Button
          variant="outline"
          disabled={loading}
          onClick={() =>
            setRefreshKey((current) => current + 1)
          }
        >
          <RefreshCw
            className={`mr-2 size-4 ${
              loading ? "animate-spin" : ""
            }`}
          />
          Actualizar
        </Button>
      </div>

      {error ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>

            <Button
              variant="outline"
              onClick={() =>
                setRefreshKey((current) => current + 1)
              }
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index}>
                    <CardContent className="space-y-3 pt-6">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-9 w-20" />
                      <Skeleton className="h-3 w-40" />
                    </CardContent>
                  </Card>
                ))
              : metrics.map((metric) => {
                  const Icon = metric.icon;

                  return (
                    <Card key={metric.title}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-muted-foreground">
                            {metric.title}
                          </p>

                          <Icon className="size-5 shrink-0 text-emerald-700" />
                        </div>

                        <p className="mt-3 text-3xl font-semibold tabular-nums">
                          {metric.value.toLocaleString("es-MX")}
                        </p>

                        <p className="mt-1 text-xs text-muted-foreground">
                          {metric.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="size-5" />
                  Carga de trabajo de moderación
                </CardTitle>

                <CardDescription>
                  Distribución de publicaciones por estado actual.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {loading || !statistics ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  moderationData.map((item) => {
                    const width =
                      (item.value / maxModerationValue) * 100;

                    return (
                      <div key={item.label} className="space-y-2">
                        <div className="flex justify-between gap-3 text-sm">
                          <span>{item.label}</span>

                          <span className="font-medium tabular-nums">
                            {item.value.toLocaleString("es-MX")}
                          </span>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-emerald-600"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  Resultados de validación
                </CardTitle>

                <CardDescription>
                  Distribución de publicaciones clasificadas
                  como fraude o no fraude.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {loading || !statistics ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Fraudes confirmados</span>
                        <span className="font-medium tabular-nums">
                          {statistics.fraud}
                        </span>
                      </div>

                      <div className="h-4 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{
                            width: `${fraudPercentage}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>No fraude</span>
                        <span className="font-medium tabular-nums">
                          {statistics.notFraud}
                        </span>
                      </div>

                      <div className="h-4 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-slate-500"
                          style={{
                            width: `${notFraudPercentage}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground">
                        Publicaciones clasificadas
                      </p>

                      <p className="mt-1 text-2xl font-semibold tabular-nums">
                        {classifiedTotal.toLocaleString("es-MX")}
                      </p>

                      {statistics.unclassified > 0 && (
                        <p className="mt-2 text-xs text-amber-700">
                          {statistics.unclassified} publicaciones
                          validadas no tienen un valor de
                          fraude definido en los datos consultados.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Métricas de reportes</CardTitle>

              <CardDescription>
                Se incorporarán cuando estén disponibles
                los endpoints de reportes.
              </CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Reportes recibidos
                </p>
                <p className="mt-2 text-sm font-medium">
                  Dato no disponible
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Publicaciones más reportadas
                </p>
                <p className="mt-2 text-sm font-medium">
                  Dato no disponible
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
