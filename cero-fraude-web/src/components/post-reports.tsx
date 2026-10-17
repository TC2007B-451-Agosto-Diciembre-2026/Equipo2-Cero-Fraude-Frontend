"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Trash2,
  UserRound,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type Props = {
  postId: number;
};

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(", ");
  }
  return "No fue posible obtener los reportes.";
}

export function PostReports({ postId }: Props) {
  const [reports, setReports] = useState<Report[]>([]);
  const [reasons, setReasons] = useState<ReportReason[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Identifies the request the screen should show. `loading` is derived
  // instead of stored: it's true until the response for this exact key
  // arrives, so the effect never has to call setLoading(true) itself.
  const requestKey = `${postId}-${page}-${refreshKey}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== requestKey;

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // The reasons catalog doesn't depend on the page, so it's loaded once.
  // If it fails, getReportReasonName falls back to "Motivo #N".
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

  // State is only set inside the promise callbacks (asynchronously), which
  // is what the react-hooks/set-state-in-effect lint rule expects.
  useEffect(() => {
    const controller = new AbortController();

    api
      .get<ReportsResponse>(`/posts/${postId}/reports`, {
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
  }, [postId, page, requestKey]);

  async function deleteReport() {
    if (deleteId === null || deleting) return;

    setDeleting(true);

    try {
      await api.delete(`/posts/${postId}/reports/${deleteId}`);

      setDeleteId(null);
      toast.success("Reporte descartado correctamente");

      // If the deleted report was the last one on this page, go back one
      // page; changing `page` already triggers a reload.
      if (reports.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setRefreshKey((current) => current + 1);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flag className="size-4 text-slate-700" aria-hidden="true" />
            Reportes recibidos
          </CardTitle>
          <CardDescription>
            {loading
              ? "Información proporcionada por otros usuarios."
              : `${total} ${total === 1 ? "reporte" : "reportes"} de otros usuarios.`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Esta publicación no tiene reportes.
            </p>
          ) : (
            <ul className="space-y-3">
              {reports.map((report) => (
                <li
                  key={report.id}
                  className="space-y-3 rounded-lg border p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Badge variant="outline">
                      {getReportReasonName(reasons, report.report_reason)}
                    </Badge>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(report.id)}
                    >
                      <Trash2 className="mr-1 size-4" />
                      Descartar
                    </Button>
                  </div>

                  <p className="break-words text-sm">
                    {report.information ?? (
                      <span className="text-muted-foreground">
                        Sin información adicional.
                      </span>
                    )}
                  </p>

                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>Reporte #{report.id}</span>
                    <Link
                      href={`/users/${report.user}`}
                      className="flex items-center gap-1 font-medium text-emerald-700 hover:underline"
                    >
                      <UserRound className="size-3.5" />
                      Ver usuario
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-3">
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
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteId(null);
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
    </>
  );
}
