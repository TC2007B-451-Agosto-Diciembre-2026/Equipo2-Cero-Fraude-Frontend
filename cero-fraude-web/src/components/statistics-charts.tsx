// Small chart building blocks for /statistics. Bars are plain HTML (no chart
// library): every bar shows its label and value as text, so the color only
// repeats information that is already readable.

import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function formatNumber(value: number) {
  return value.toLocaleString("es-MX");
}

function formatPercent(value: number, total: number) {
  return `${Math.round((value / total) * 100)}%`;
}

type StatKpiProps = {
  label: string;
  value: number | null;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function StatKpi({ label, value, hint, icon: Icon }: Readonly<StatKpiProps>) {
  return (
    <Card className="h-full">
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>{label}</span>
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        </div>

        {value === null ? (
          <Skeleton className="my-1 h-8 w-20" />
        ) : (
          <p className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
            {formatNumber(value)}
          </p>
        )}

        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function SectionHeading({
  title,
  description,
}: Readonly<{ title: string; description: React.ReactNode }>) {
  return (
    <div className="mt-8 mb-3">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">
        {title}
      </h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

type PanelProps = {
  title: string;
  description: React.ReactNode;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  // True when the data loaded but there is nothing to draw.
  empty?: boolean;
  wide?: boolean;
  skeletonRows?: number;
  children: React.ReactNode;
};

// Card with the loading, error and empty states every chart needs.
export function Panel({
  title,
  description,
  loading,
  error,
  onRetry,
  empty = false,
  wide = false,
  skeletonRows = 4,
  children,
}: Readonly<PanelProps>) {
  return (
    <Card className={wide ? "lg:col-span-2" : undefined}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {loading ? (
          <div className="flex flex-col gap-4" aria-busy="true" aria-label="Cargando">
            {Array.from({ length: skeletonRows }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-8 text-center"
          >
            <CircleAlert className="size-5 text-red-700" aria-hidden="true" />
            <p className="text-sm text-slate-900">{error}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        ) : empty ? (
          <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            Sin datos
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

type BarProps = {
  label: string;
  value: number;
  max: number;
  // Tailwind background class of the fill.
  colorClass?: string;
  // When set, the value also shows its share of this total.
  total?: number;
};

export function Bar({
  label,
  value,
  max,
  colorClass = "bg-slate-700",
  total,
}: Readonly<BarProps>) {
  // A non-zero value always gets a visible sliver.
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
  const share = total ? ` · ${formatPercent(value, total)}` : "";

  return (
    <div title={`${label}: ${formatNumber(value)}${share}`}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-slate-800">{label}</span>
        <span className="font-semibold text-slate-900 tabular-nums">
          {formatNumber(value)}
          {total ? (
            <span className="font-normal text-muted-foreground">{share}</span>
          ) : null}
        </span>
      </div>

      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"
        aria-hidden="true"
      >
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function Mini({
  label,
  value,
  hint,
}: Readonly<{ label: string; value: number; hint: string }>) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">
        {formatNumber(value)}
      </p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

// Vertical bars with the value on top and the label below (one series).
export function ColumnChart({
  label,
  items,
}: Readonly<{ label: string; items: { label: string; count: number }[] }>) {
  const max = Math.max(...items.map((item) => item.count), 0);

  return (
    <div
      role="img"
      aria-label={`${label}: ${items
        .map((item) => `${item.label} ${item.count}`)
        .join(", ")}`}
      className="flex h-44 items-end gap-3"
    >
      {items.map((item) => (
        <div
          key={item.label}
          title={`${item.label}: ${formatNumber(item.count)}`}
          className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
        >
          <span className="text-xs font-semibold text-slate-900 tabular-nums">
            {formatNumber(item.count)}
          </span>
          <div
            className="w-full rounded-t-md bg-emerald-700"
            style={{
              height: max > 0
                ? `${Math.max((item.count / max) * 75, item.count > 0 ? 3 : 0)}%`
                : 0,
            }}
          />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

type HeatmapColumn = {
  label: string;
  // "r,g,b" of the column color, the cell opacity carries the magnitude.
  rgb: string;
};

type HeatmapProps = {
  rowHeader: string;
  columns: HeatmapColumn[];
  rows: { label: string; values: number[] }[];
};

// Table where each cell is tinted by its value. The number is always
// printed, so the tint is only a visual aid.
export function Heatmap({ rowHeader, columns, rows }: Readonly<HeatmapProps>) {
  const max = Math.max(...rows.flatMap((row) => row.values), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th
              scope="col"
              className="px-2 py-1 text-left text-xs font-medium text-muted-foreground"
            >
              {rowHeader}
            </th>
            {columns.map((column) => (
              <th
                key={column.label}
                scope="col"
                className="px-2 py-1 text-center text-xs font-medium text-muted-foreground"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th
                scope="row"
                className="p-2 text-left font-medium text-slate-900"
              >
                {row.label}
              </th>
              {row.values.map((value, index) => (
                <td
                  key={columns[index].label}
                  title={`${row.label} · ${columns[index].label}: ${formatNumber(value)}`}
                  className="rounded-md p-2 text-center font-semibold text-slate-900 tabular-nums"
                  style={{
                    // Square root keeps small counts visible next to big ones.
                    background:
                      value > 0 && max > 0
                        ? `rgba(${columns[index].rgb},${(0.08 + 0.3 * Math.sqrt(value / max)).toFixed(2)})`
                        : "#f8fafc",
                  }}
                >
                  {formatNumber(value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
