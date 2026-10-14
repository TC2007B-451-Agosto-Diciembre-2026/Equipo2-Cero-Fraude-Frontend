"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import axios from "axios";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  ImageIcon,
  Trash2,
} from "lucide-react";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type Evidence = {
  id: number;
  url: string;
  evidence_type_id: number;
  post_id: number;
  created_at: string;
  is_visible?: boolean | number;
};

type Props = {
  postId: number;
  evidences: Evidence[];
  onUpdated: () => void;
  canManage?: boolean;
};

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(", ");
  }
  return "No fue posible completar la operación.";
}

export function PostEvidenceManager({
  postId,
  evidences,
  onUpdated,
  canManage = true,
}: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);

  const [localEvidences, setLocalEvidences] = useState(evidences);

  useEffect(() => {
    setLocalEvidences(evidences);
  }, [evidences]);

  const selectedIndex = localEvidences.findIndex(
    (evidence) => evidence.id === selectedId
  );

  const selectedEvidence =
    selectedIndex >= 0 ? localEvidences[selectedIndex] : null;

  function navigatePreview(direction: number) {
    if (selectedIndex < 0 || localEvidences.length < 2) return;

    const nextIndex =
      (selectedIndex + direction + localEvidences.length) %
      localEvidences.length;

    setSelectedId(localEvidences[nextIndex].id);
  }

  async function toggleVisibility(evidence: Evidence) {
    if (pendingId !== null) return;

    const nextVisibility = !Boolean(evidence.is_visible);

    setPendingId(evidence.id);

    try {
      await api.patch(
        `/posts/${postId}/evidences/${evidence.id}`,
        { is_visible: nextVisibility }
      );

      setLocalEvidences((current) =>
        current.map((item) =>
          item.id === evidence.id
            ? { ...item, is_visible: nextVisibility }
            : item
        )
      );

      toast.success(
        nextVisibility
          ? "Evidencia visible al público"
          : "Evidencia oculta al público"
      );

      onUpdated();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setPendingId(null);
    }
  }

  async function deleteEvidence() {
    if (deleteId === null || pendingId !== null) return;

    const evidenceId = deleteId;
    setPendingId(evidenceId);

    try {
      await api.delete(`/posts/${postId}/evidences/${evidenceId}`);

      setLocalEvidences((current) =>
        current.filter((item) => item.id !== evidenceId)
      );

      if (selectedId === evidenceId) {
        setSelectedId(null);
      }

      setDeleteId(null);
      toast.success("Evidencia eliminada correctamente");
      onUpdated();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Evidencias</CardTitle>
          <CardDescription>
            Consulta y administración de archivos adjuntos.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {localEvidences.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay evidencias registradas.
            </p>
          ) : (
            localEvidences.map((evidence) => {
              const visible = Boolean(evidence.is_visible);
              const isPending = pendingId !== null;

              return (
                <div
                  key={evidence.id}
                  className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center"
                >
                  <button
                    type="button"
                    className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg border bg-muted sm:w-36"
                    onClick={() => setSelectedId(evidence.id)}
                    aria-label={`Vista previa de evidencia ${evidence.id}`}
                  >
                    <Image
                      src={evidence.url}
                      alt={`Evidencia ${evidence.id}`}
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  </button>

                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">
                        Evidencia #{evidence.id}
                      </p>

                      {evidence.is_visible !== undefined && (
                        <Badge
                          variant="outline"
                          className={
                            visible
                              ? "border-emerald-200 text-emerald-700"
                              : "border-amber-200 text-amber-700"
                          }
                        >
                          {visible ? "Visible" : "Oculta"}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedId(evidence.id)}
                      >
                        <Eye className="mr-2 size-4" />
                        Vista previa
                      </Button>

                      {canManage && evidence.is_visible !== undefined && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => void toggleVisibility(evidence)}
                        >
                          {visible ? (
                            <EyeOff className="mr-2 size-4" />
                          ) : (
                            <Eye className="mr-2 size-4" />
                          )}
                          {visible ? "Ocultar" : "Mostrar"}
                        </Button>
                      )}

                      {canManage && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={isPending}
                          onClick={() => setDeleteId(evidence.id)}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog
        open={selectedEvidence !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <DialogContent className="max-w-5xl sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              Vista previa de evidencia
            </DialogTitle>
            <DialogDescription>
              {selectedIndex + 1} de {localEvidences.length}
              {selectedEvidence
                ? ` · Evidencia #${selectedEvidence.id}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedEvidence && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Evidencia anterior"
                disabled={localEvidences.length < 2}
                onClick={() => navigatePreview(-1)}
              >
                <ChevronLeft className="size-5" />
              </Button>

              <div className="relative flex h-[55vh] min-w-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-muted">
                <Image
                  key={selectedEvidence.id}
                  src={selectedEvidence.url}
                  alt={`Vista ampliada de evidencia ${selectedEvidence.id}`}
                  fill
                  unoptimized
                  className="object-contain"
                />
              </div>

              <Button
                variant="outline"
                size="icon"
                aria-label="Evidencia siguiente"
                disabled={localEvidences.length < 2}
                onClick={() => navigatePreview(1)}
              >
                <ChevronRight className="size-5" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open && pendingId === null) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar evidencia?
            </AlertDialogTitle>
            <AlertDialogDescription>
              La evidencia dejará de estar disponible en la
              publicación. Esta acción es diferente de ocultarla
              al público.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendingId !== null}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={pendingId !== null}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void deleteEvidence();
              }}
            >
              Eliminar evidencia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
