
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  ArrowRight,
  ChartColumnDecreasing,
  CheckCircle2,
  Clock3,
  FileText,
  RefreshCw,
  ShieldAlert,
  Users,
} from "lucide-react";

import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { PostStatusBadge } from "@/components/post-status-badge";
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
  title: string;
  description?: string;
  status_id: number;
  published_at?: string | null;
};

type PostsResponse = {
  data: PostSummary[];
  page: number;
  total_pages: number;
  total: number;
};

type UsersResponse = {
  data: unknown[];
  page: number;
  total_pages: number;
  total: number;
};

type DashboardData = {
  pendingReview: number;
  pendingValidation: number;
  validated: number;
  activeUsers: number;
  posts: PostSummary[];
  statusCodes: Record<number, string>;
};

type Metric = {
  label: string;
  value: number;
  description: string;
  icon: typeof Clock3;
  // Only the metrics that need action link to a filtered list.
  href?: string;
};

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

  return "No fue posible cargar el panel principal.";
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadDashboard = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const statesResponse = await api.get<PostStatus[]>(
        "/states",
        { signal }
      );

      const states = statesResponse.data;

      const getStatusId = (code: string) => {
        const status = states.find(
          (item) => item.code === code
        );

        if (!status) {
          throw new Error(
            `No se encontró el estado ${code}.`
          );
        }

        return status.id;
      };

      const uploadedId = getStatusId("UPLOADED");
      const publishedId = getStatusId("PUBLISHED");
      const validatedId = getStatusId("VALIDATED");

      const [
        uploadedResponse,
        publishedResponse,
        validatedResponse,
        usersResponse,
      ] = await Promise.all([
        api.get<PostsResponse>("/posts", {
          params: {
            page: 1,
            status_id: uploadedId,
          },
          signal,
        }),

        api.get<PostsResponse>("/posts", {
          params: {
            page: 1,
            status_id: publishedId,
          },
          signal,
        }),

        api.get<PostsResponse>("/posts", {
          params: {
            page: 1,
            status_id: validatedId,
          },
          signal,
        }),

        api.get<UsersResponse>("/users", {
          params: {
            page: 1,
            is_active: true,
          },
          signal,
        }),
      ]);

      if (signal.aborted) return;

      const pendingPosts = [
        ...uploadedResponse.data.data,
        ...publishedResponse.data.data,
      ];

      setData({
        pendingReview: uploadedResponse.data.total,
        pendingValidation: publishedResponse.data.total,
        validated: validatedResponse.data.total,
        activeUsers: usersResponse.data.total,
        posts: pendingPosts,
        statusCodes: Object.fromEntries(
          states.map((state) => [
            state.id,
            state.code,
          ])
        ),
      });
    } catch (error) {
      if (signal.aborted || axios.isCancel(error)) {
        return;
      }

      setData(null);
      setError(getErrorMessage(error));
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void loadDashboard(controller.signal);

    return () => controller.abort();
  }, [loadDashboard, refreshKey]);

  const metrics: Metric[] = data
    ? [
        {
          label: "Pendientes de revisión",
          value: data.pendingReview,
          description: "Publicaciones por revisar",
          icon: Clock3,
          href: "/posts?status=UPLOADED",
        },
        {
          label: "Pendientes de validación",
          value: data.pendingValidation,
          description: "Publicaciones publicadas sin validar",
          icon: ShieldAlert,
          href: "/posts?status=PUBLISHED",
        },
        {
          label: "Usuarios activos",
          value: data.activeUsers,
          description: "Cuentas activas del sistema",
          icon: Users,
        },
        {
          label: "Publicaciones validadas",
          value: data.validated,
          description: "Casos con validación realizada",
          icon: CheckCircle2,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel principal"
        description="Resumen de actividad y tareas pendientes de Cero Fraude."
      >
        <Button
          variant="outline"
          disabled={loading}
          onClick={() =>
            setRefreshKey((current) => current + 1)
          }
        >
          <RefreshCw
            data-icon="inline-start"
            className={loading ? "animate-spin" : ""}
          />
          Actualizar
        </Button>
      </PageHeader>

      {error ? (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <p
              role="alert"
              className="text-sm text-destructive"
            >
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index}>
                    <CardContent className="space-y-3 pt-6">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-9 w-20" />
                      <Skeleton className="h-3 w-36" />
                    </CardContent>
                  </Card>
                ))
              : metrics.map((metric) => {
                  const Icon = metric.icon;

                  const card = (
                    <Card
                      className={
                        metric.href
                          ? "h-full border-emerald-200 transition-colors hover:bg-emerald-50/40"
                          : "h-full"
                      }
                    >
                      <CardContent className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                          <span>{metric.label}</span>
                          <Icon
                            className="size-4 shrink-0 text-emerald-700"
                            aria-hidden="true"
                          />
                        </div>

                        <p className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                          {metric.value.toLocaleString("es-MX")}
                        </p>

                        <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
                          <span className="min-w-0">
                            {metric.description}
                          </span>

                          {metric.href && (
                            <span className="flex shrink-0 items-center gap-1 font-semibold whitespace-nowrap text-emerald-800">
                              Revisar
                              <ArrowRight
                                className="size-3"
                                aria-hidden="true"
                              />
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );

                  return metric.href ? (
                    <Link
                      key={metric.label}
                      href={metric.href}
                      className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {card}
                    </Link>
                  ) : (
                    <div key={metric.label}>{card}</div>
                  );
                })}
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">
                      Publicaciones pendientes de atención
                    </CardTitle>

                    <CardDescription>
                      Publicaciones subidas o pendientes
                      de validación.
                    </CardDescription>
                  </div>

                  <Button variant="outline" size="sm" asChild>
                    <Link href="/posts">
                      Ver todas
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton
                      key={index}
                      className="h-16 w-full"
                    />
                  ))
                ) : !data || data.posts.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <CheckCircle2 className="mx-auto mb-3 size-8 text-emerald-700" />

                    <p className="text-sm font-medium">
                      No hay publicaciones pendientes.
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      No se encontraron publicaciones
                      en los estados consultados.
                    </p>
                  </div>
                ) : (
                  data.posts.slice(0, 8).map((post) => {
                    const statusCode =
                      data.statusCodes[post.status_id] ??
                      "";

                    return (
                      <Link
                        key={post.id}
                        href={`/posts/${post.id}`}
                        className="flex items-center justify-between gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {post.title || "Sin título"}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            Publicación #{post.id}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <PostStatusBadge code={statusCode} />
                          <ArrowRight
                            className="size-4 text-muted-foreground"
                            aria-hidden="true"
                          />
                        </div>
                      </Link>
                    );
                  })
                )}

                {!loading && data && data.posts.length > 8 && (
                  <p className="text-xs text-muted-foreground">
                    Mostrando una selección de publicaciones.
                    Consulta la lista completa para ver más.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Accesos rápidos</CardTitle>

                <CardDescription>
                  Navega a las principales áreas administrativas.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/posts">
                    <FileText data-icon="inline-start" />
                    Administrar publicaciones
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/users">
                    <Users data-icon="inline-start" />
                    Administrar usuarios
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <Link href="/statistics">
                    <ChartColumnDecreasing data-icon="inline-start" />
                    Ver estadísticas
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
