"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import {
  getReportReasonName,
  type Report,
  type ReportReason,
  type ReportsResponse,
} from "@/lib/reports";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const COLUMN_COUNT = 6;

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(", ");
  }
  return "No fue posible obtener los reportes.";
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [reasons, setReasons] = useState<ReportReason[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Same derived loading state as PostReports: true until the response
  // for the current page/refresh arrives.
  const requestKey = `${page}-${refreshKey}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== requestKey;

  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    api
      .get<ReportReason[]>("/report-reasons", {
        signal: controller.signal,
      })
      .then((response) => setReasons(response.data))
      .catch(() => {});

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    api
      .get<ReportsResponse>("/reports", {
        params: { page },
        signal: controller.signal,
      })
      .then((response) => {
        setReports(response.data.data);
        setTotalPages(Math.max(1, response.data.total_pages));
        setTotal(response.data.total);
        setError(null);
      })
      .catch((error) => {
        if (controller.signal.aborted || axios.isCancel(error)) return;

        setReports([]);
        setError(getErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadedKey(requestKey);
        }
      });

    return () => controller.abort();
  }, [page, requestKey]);

  function refreshReports() {
    setRefreshKey((current) => current + 1);
  }

  async function deleteReport() {
    if (deleteTarget === null || deleting) return;

    setDeleting(true);

    try {
      // The delete endpoint is nested under the post, so the report's
      // `post` field is needed to build the URL.
      await api.delete(
        `/posts/${deleteTarget.post}/reports/${deleteTarget.id}`
      );

      setDeleteTarget(null);
      toast.success("Reporte descartado correctamente");

      if (reports.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        refreshReports();
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Reportes
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Reportes enviados por usuarios sobre publicaciones visibles.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={refreshReports}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`}
          />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Reporte</TableHead>
                  <TableHead>Publicación</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Información</TableHead>
                  <TableHead>Reportante</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: COLUMN_COUNT }).map(
                        (_, cell) => (
                          <TableCell key={cell}>
                            <Skeleton className="h-5 w-full max-w-40" />
                          </TableCell>
                        )
                      )}
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell
                      colSpan={COLUMN_COUNT}
                      className="py-12 text-center"
                    >
                      <p role="alert" className="text-sm text-destructive">
                        {error}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={refreshReports}
                      >
                        Reintentar
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : reports.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={COLUMN_COUNT}
                      className="py-12 text-center"
                    >
                      <Flag className="mx-auto mb-3 size-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No hay reportes pendientes.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        #{report.id}
                      </TableCell>

                      <TableCell>
                        <Link
                          href={`/posts/${report.post}`}
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          Publicación #{report.post}
                        </Link>
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">
                          {getReportReasonName(
                            reasons,
                            report.report_reason
                          )}
                        </Badge>
                      </TableCell>

                      <TableCell
                        className="max-w-xs truncate"
                        title={report.information ?? undefined}
                      >
                        {report.information ?? (
                          <span className="text-muted-foreground">
                            Sin información adicional
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Link
                          href={`/users/${report.user}`}
                          className="text-emerald-700 hover:underline"
                        >
                          Ver usuario
                        </Link>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          aria-label={`Descartar reporte #${report.id}`}
                          onClick={() => setDeleteTarget(report)}
                        >
                          <Trash2 className="mr-1 size-4" />
                          Descartar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Cargando reportes..."
                : `${total} ${total === 1 ? "reporte" : "reportes"} en total`}
            </p>

            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </span>

              <Button
                variant="outline"
                size="icon"
                aria-label="Página anterior"
                disabled={loading || page <= 1}
                onClick={() =>
                  setPage((current) => Math.max(1, current - 1))
                }
              >
                <ChevronLeft className="size-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                aria-label="Página siguiente"
                disabled={loading || page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Descartar reporte?</AlertDialogTitle>
            <AlertDialogDescription>
              El reporte se eliminará de forma permanente. La
              publicación no se modifica.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void deleteReport();
              }}
            >
              Descartar reporte
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
