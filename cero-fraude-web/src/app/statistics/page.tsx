"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import {
  loadContentStats,
  loadModerationStats,
  loadReportStats,
  loadUserStats,
  VISIBLE_STATUSES,
} from "@/lib/statistics";
import { postStatusLabels } from "@/components/post-status-badge";
import { PageHeader } from "@/components/page-header";
import {
  Bar,
  ColumnChart,
  formatNumber,
  Heatmap,
  Mini,
  Panel,
  SectionHeading,
  StatKpi,
} from "@/components/statistics-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Same hues as the post status badges (700 steps, readable on white).
const statusColors = {
  UPLOADED: { bar: "bg-amber-700", rgb: "180,83,9" },
  PUBLISHED: { bar: "bg-blue-700", rgb: "29,78,216" },
  VALIDATED: { bar: "bg-emerald-700", rgb: "4,120,87" },
  REJECTED: { bar: "bg-red-700", rgb: "185,28,28" },
} as const;

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(", ");
  }

  if (error instanceof Error) return error.message;

  return "No fue posible obtener los datos.";
}

type LoadState<T> = {
  key: number;
  data: T | null;
  error: string | null;
};

// Runs one section loader per refresh. `loading` is derived from the key
// (state is only set in the promise callbacks), like post-reports.tsx.
function useSection<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  refreshKey: number
) {
  const [state, setState] = useState<LoadState<T> | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    loader(controller.signal)
      .then((data) => setState({ key: refreshKey, data, error: null }))
      .catch((error) => {
        if (controller.signal.aborted || axios.isCancel(error)) return;

        setState({
          key: refreshKey,
          data: null,
          error: getErrorMessage(error),
        });
      });

    return () => controller.abort();
  }, [loader, refreshKey]);

  const loading = state?.key !== refreshKey;

  return {
    loading,
    data: loading ? null : (state?.data ?? null),
    error: loading ? null : (state?.error ?? null),
  };
}

export default function StatisticsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((current) => current + 1);

  const moderation = useSection(loadModerationStats, refreshKey);
  const content = useSection(loadContentStats, refreshKey);
  const reports = useSection(loadReportStats, refreshKey);
  const users = useSection(loadUserStats, refreshKey);

  const anyLoading =
    moderation.loading || content.loading || reports.loading || users.loading;

  const mod = moderation.data;
  const validatedTotal = mod ? mod.fraud + mod.notFraud + mod.unclassified : 0;

  const workload = mod
    ? [
        { code: "UPLOADED", label: "Pendientes de revisión" },
        { code: "PUBLISHED", label: "Pendientes de validación" },
        { code: "VALIDATED", label: "Validadas" },
        { code: "REJECTED", label: "Rechazadas" },
      ].map((item) => ({
        ...item,
        value: mod.byStatus[item.code as keyof typeof mod.byStatus],
      }))
    : [];
  const workloadMax = Math.max(...workload.map((item) => item.value), 0);

  const cont = content.data;
  const withCategory = cont
    ? cont.categories.reduce((sum, item) => sum + item.count, 0)
    : 0;

  const rep = reports.data;
  const usr = users.data;

  return (
    <div>
      <PageHeader
        title="Estadísticas"
        description="Seguimiento de publicaciones, reportes y usuarios."
      >
        <Button variant="outline" onClick={refresh} disabled={anyLoading}>
          <RefreshCw
            data-icon="inline-start"
            className={anyLoading ? "animate-spin" : ""}
          />
          Actualizar
        </Button>
      </PageHeader>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatKpi
          label="Pendientes de revisión"
          value={mod?.byStatus.UPLOADED ?? null}
          hint="Publicaciones subidas"
          icon={Clock3}
        />
        <StatKpi
          label="Pendientes de validación"
          value={mod?.byStatus.PUBLISHED ?? null}
          hint="Publicadas, sin validar"
          icon={ShieldAlert}
        />
        <StatKpi
          label="Fraudes confirmados"
          value={mod?.fraud ?? null}
          hint="Validadas como fraude"
          icon={ShieldCheck}
        />
        <StatKpi
          label="Validadas como no fraude"
          value={mod?.notFraud ?? null}
          hint="Validadas sin fraude"
          icon={CheckCircle2}
        />
      </div>

      <SectionHeading
        title="Moderación"
        description={
          mod
            ? `Estado actual de las ${formatNumber(mod.total)} publicaciones y resultado de las validaciones.`
            : "Estado actual de las publicaciones y resultado de las validaciones."
        }
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel
          title="Carga de trabajo"
          description="Publicaciones por estado actual."
          loading={moderation.loading}
          error={moderation.error}
          onRetry={refresh}
          empty={mod?.total === 0}
        >
          {workload.map((item) => (
            <Bar
              key={item.code}
              label={item.label}
              value={item.value}
              max={workloadMax}
              colorClass={
                statusColors[item.code as keyof typeof statusColors].bar
              }
            />
          ))}
        </Panel>

        <Panel
          title="Resultados de validación"
          description="Publicaciones validadas, clasificadas como fraude o no fraude."
          loading={moderation.loading}
          error={moderation.error}
          onRetry={refresh}
          empty={validatedTotal === 0}
          skeletonRows={3}
        >
          {mod && (
            <>
              <Bar
                label="Fraudes confirmados"
                value={mod.fraud}
                max={validatedTotal}
                total={validatedTotal}
                colorClass="bg-red-700"
              />
              <Bar
                label="No fraude"
                value={mod.notFraud}
                max={validatedTotal}
                total={validatedTotal}
                colorClass="bg-emerald-700"
              />
              {mod.unclassified > 0 && (
                <p className="flex items-start gap-2 text-xs text-amber-800">
                  <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {mod.unclassified}{" "}
                  {mod.unclassified === 1
                    ? "publicación validada no indica"
                    : "publicaciones validadas no indican"}{" "}
                  si es fraude.
                </p>
              )}
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  Publicaciones validadas
                </p>
                <p className="text-2xl font-bold text-slate-900 tabular-nums">
                  {formatNumber(validatedTotal)}
                </p>
              </div>
            </>
          )}
        </Panel>
      </div>

      <SectionHeading
        title="Contenido"
        description="Qué tipo de publicaciones se reciben."
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel
          title="Publicaciones por categoría"
          description={
            cont
              ? `${formatNumber(withCategory)} de ${formatNumber(cont.total)} publicaciones tienen categoría.`
              : "Publicaciones con cada categoría."
          }
          loading={content.loading}
          error={content.error}
          onRetry={refresh}
          empty={withCategory === 0}
          skeletonRows={6}
        >
          {cont?.categories.map((item) => (
            <Bar
              key={item.id}
              label={item.name}
              value={item.count}
              max={cont.categories[0].count}
              total={withCategory}
            />
          ))}
        </Panel>

        <Panel
          title="Publicaciones por tipo de fraude"
          description="Una publicación puede tener varios tipos, por eso la suma supera el total."
          loading={content.loading}
          error={content.error}
          onRetry={refresh}
          empty={cont?.types.every((item) => item.count === 0)}
          skeletonRows={6}
        >
          {cont?.types.map((item) => (
            <Bar
              key={item.id}
              label={item.name}
              value={item.count}
              max={cont.types[0].count}
            />
          ))}
        </Panel>

        <Panel
          wide
          title="Categoría por estado"
          description="Cuántas publicaciones de cada categoría están en cada estado."
          loading={content.loading}
          error={content.error}
          onRetry={refresh}
          empty={withCategory === 0}
          skeletonRows={6}
        >
          {cont && (
            <Heatmap
              rowHeader="Categoría"
              columns={VISIBLE_STATUSES.map((code) => ({
                label: postStatusLabels[code],
                rgb: statusColors[code].rgb,
              }))}
              rows={cont.categories.map((category) => ({
                label: category.name,
                values: cont.matrix[category.id],
              }))}
            />
          )}
        </Panel>
      </div>

      <SectionHeading
        title="Reportes"
        description={
          <>
            Reportes de usuarios sobre publicaciones visibles.{" "}
            <Link
              href="/reports"
              className="font-medium text-emerald-800 hover:underline"
            >
              Ver reportes
            </Link>
          </>
        }
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel
          title="Reportes por motivo"
          description={
            rep
              ? `Calculado con los ${formatNumber(rep.total)} reportes recibidos.`
              : "Motivos que eligieron los usuarios al reportar."
          }
          loading={reports.loading}
          error={reports.error}
          onRetry={refresh}
          empty={rep?.total === 0}
          skeletonRows={6}
        >
          {rep && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Mini label="Reportes recibidos" value={rep.total} hint="En total" />
                <Mini
                  label="Publicaciones reportadas"
                  value={rep.reportedPosts}
                  hint="Con al menos un reporte"
                />
              </div>
              {rep.byReason.map((item) => (
                <Bar
                  key={item.id}
                  label={item.name}
                  value={item.count}
                  max={rep.byReason[0].count}
                  total={rep.total}
                />
              ))}
            </>
          )}
        </Panel>

        <Panel
          title="Publicaciones más reportadas"
          description="Las 5 con más reportes."
          loading={reports.loading}
          error={reports.error}
          onRetry={refresh}
          empty={rep?.topPosts.length === 0}
          skeletonRows={5}
        >
          <ol className="flex flex-col gap-2">
            {rep?.topPosts.map((post, index) => (
              <li
                key={post.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <span
                  aria-hidden="true"
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-800"
                >
                  {index + 1}
                </span>
                <Link
                  href={`/posts/${post.id}`}
                  className="min-w-0 flex-1 hover:underline"
                >
                  <span className="block truncate text-sm font-medium text-slate-900">
                    {post.title || "Sin título"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Publicación #{post.id}
                  </span>
                </Link>
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {post.count} {post.count === 1 ? "reporte" : "reportes"}
                </Badge>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <SectionHeading
        title="Usuarios"
        description="Cuentas registradas en Cero Fraude."
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel
          title="Cuentas"
          description="Totales por rol y estado."
          loading={users.loading}
          error={users.error}
          onRetry={refresh}
          skeletonRows={2}
        >
          {usr && (
            <div className="grid grid-cols-2 gap-3">
              <Mini label="Usuarios registrados" value={usr.total} hint="En total" />
              <Mini
                label="Administradores"
                value={usr.admins}
                hint={`${formatNumber(usr.total - usr.admins)} usuarios`}
              />
              <Mini label="Cuentas activas" value={usr.active} hint="Con acceso" />
              <Mini
                label="Cuentas inactivas"
                value={usr.total - usr.active}
                hint="Sin acceso"
              />
            </div>
          )}
        </Panel>

        <Panel
          title="Registros por mes"
          description="Cuentas creadas en los últimos 6 meses."
          loading={users.loading}
          error={users.error}
          onRetry={refresh}
          skeletonRows={3}
        >
          {usr && (
            <ColumnChart
              label="Registros por mes"
              items={usr.registrationsByMonth}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
