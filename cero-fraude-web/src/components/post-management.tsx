
"use client";

import { useState } from "react";
import axios from "axios";
import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { AuthoritySortableList } from "@/components/authority-sortable-list";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";

type PostStatus =
  | "DRAFT"
  | "UPLOADED"
  | "PUBLISHED"
  | "VALIDATED"
  | "REJECTED";

type PostComment = {
  id: number;
  user: string;
  text: string;
  created_at: string;
  is_visible?: boolean | number;
};

type Authority = {
  id: number;
  name: string;
};

type ModerationAction = {
  label: string;
  statusId: number;
  isFraud?: boolean;
  variant: "default" | "outline" | "destructive";
};

const statusLabels: Record<PostStatus, string> = {
  DRAFT: "Borrador",
  UPLOADED: "Subida",
  PUBLISHED: "Publicada",
  VALIDATED: "Validada",
  REJECTED: "Rechazada",
};


type Props = {
  postId: number;
  initialStatus: PostStatus;
  initialIsFraud: boolean | null;
  initialComments: PostComment[];
  statusIds: {
    PUBLISHED?: number;
    VALIDATED?: number;
    REJECTED?: number;
  };
  onUpdated: () => void;
  initialAuthorityIds: number[];
  availableAuthorities: Authority[];
};

export function PostManagement({
  postId,
  initialStatus,
  initialIsFraud,
  initialComments,
  initialAuthorityIds,
  availableAuthorities,
  statusIds,
  onUpdated,
}: Readonly<Props>) {
  const [status, setStatus] = useState(initialStatus);
  const [isFraud, setIsFraud] = useState(initialIsFraud);
  const [comments, setComments] = useState(initialComments);
  const [commentText, setCommentText] = useState("");
  const [selectedAction, setSelectedAction] = useState<ModerationAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAuthorityIds, setSelectedAuthorityIds] = useState<number[]>(
    initialAuthorityIds
  );
  const [authorityToAdd, setAuthorityToAdd] = useState("");


const availableActions: ModerationAction[] = [];

if (status === "UPLOADED") {
if (statusIds.PUBLISHED !== undefined) {
    availableActions.push({
    label: "Publicar",
    statusId: statusIds.PUBLISHED,
    variant: "default",
    });
}

if (statusIds.REJECTED !== undefined) {
    availableActions.push({
    label: "Rechazar",
    statusId: statusIds.REJECTED,
    variant: "destructive",
    });
}
}

if (status === "PUBLISHED") {
if (statusIds.VALIDATED !== undefined) {
    availableActions.push(
    {
        label: "Validar como fraude",
        statusId: statusIds.VALIDATED,
        isFraud: true,
        variant: "default",
    },
    {
        label: "Validar como no fraude",
        statusId: statusIds.VALIDATED,
        isFraud: false,
        variant: "outline",
    }
    );
}

if (statusIds.REJECTED !== undefined) {
    availableActions.push({
    label: "Rechazar",
    statusId: statusIds.REJECTED,
    variant: "destructive",
    });
}
}


const isFraudValidation =
  selectedAction?.statusId === statusIds.VALIDATED &&
  selectedAction?.isFraud === true;

function openAction(action: ModerationAction) {
  setSelectedAuthorityIds(initialAuthorityIds);
  setAuthorityToAdd("");
  setError(null);
  setSelectedAction(action);
}

function addAuthority() {
  if (!authorityToAdd) return;

  const authorityId = Number(authorityToAdd);

  setSelectedAuthorityIds((current) =>
    current.includes(authorityId)
      ? current
      : [...current, authorityId]
  );

  setAuthorityToAdd("");
}

function removeAuthority(authorityId: number) {
  setSelectedAuthorityIds((current) =>
    current.filter((id) => id !== authorityId)
  );
}

function moveAuthority(index: number, direction: -1 | 1) {
  setSelectedAuthorityIds((current) => {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= current.length) {
      return current;
    }

    const updated = [...current];

    [updated[index], updated[nextIndex]] = [
      updated[nextIndex],
      updated[index],
    ];

    return updated;
  });
}

const remainingAuthorities = availableAuthorities.filter(
  (authority) => !selectedAuthorityIds.includes(authority.id)
);


  async function confirmAction() {
    if (!selectedAction) return;

    setLoading(true);
    setError(null);

    try {
      await api.patch(`/posts/${postId}`, {
        status_id: selectedAction.statusId,

        ...(selectedAction.isFraud !== undefined && {
          is_fraud: selectedAction.isFraud,
        }),

        ...(isFraudValidation && {
          authorities: selectedAuthorityIds,
        }),
      });

      const nextStatus = (
  Object.entries(statusIds).find(
    ([, id]) => id === selectedAction.statusId
  )?.[0]
) as PostStatus | undefined;

      if (nextStatus) setStatus(nextStatus);

      if (selectedAction.isFraud !== undefined) {
        setIsFraud(selectedAction.isFraud);
      }

      setSelectedAction(null);

      toast.success("Estado actualizado correctamente");

      onUpdated();
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? String(
              err.response?.data?.message ??
              "No fue posible actualizar la publicación."
            )
          : "Ocurrió un error inesperado."
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitComment() {
    const text = commentText.trim();
    if (!text || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.post<PostComment>(
        `/posts/${postId}/comments`,
        { text }
      );

      setComments((current) => [...current, response.data]);
      setCommentText("");
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? String(
              err.response?.data?.message ??
              "No fue posible publicar el comentario."
            )
          : "Ocurrió un error inesperado."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Moderación</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              Estado actual
            </span>
            <Badge variant="outline">{statusLabels[status]}</Badge>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              Validación
            </span>
            <span className="text-sm font-medium">
              {isFraud === null
                ? "Sin validar"
                : isFraud
                  ? "Fraude"
                  : "No fraude"}
            </span>
          </div>

          <div className="space-y-2">
            {availableActions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant}
                className="w-full"
                disabled={loading}
                onClick={() => openAction(action)}
              >
                {action.label}
              </Button>
            ))}
          </div>

          {status === "REJECTED" && (
            <p className="text-sm text-red-700">
              Esta publicación fue rechazada. Es un estado final.
            </p>
          )}

          {status === "VALIDATED" && (
            <p className="text-sm text-muted-foreground">
              Esta publicación ya fue validada.
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comentarios administrativos</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay comentarios registrados.
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="text-sm font-semibold">{comment.user}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.created_at).toLocaleString("es-MX")}
                  </span>
                </div>

                <p className="mt-2 text-sm">{comment.text}</p>

                {comment.is_visible !== undefined &&
                  !comment.is_visible && (
                    <Badge variant="outline" className="mt-2">
                      Oculto
                    </Badge>
                  )}
              </div>
            ))
          )}

          <div className="space-y-3 border-t pt-4">
            <label htmlFor="comment-text" className="text-sm font-medium">
              Escribir un comentario
            </label>

            <Textarea
              id="comment-text"
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Escribe un comentario administrativo..."
              rows={4}
            />

            <div className="flex justify-end">
              <Button
                disabled={!commentText.trim() || loading}
                onClick={submitComment}
              >
                {loading ? "Guardando..." : "Publicar comentario"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

<AlertDialog
  open={selectedAction !== null}
  onOpenChange={(open) => {
    if (!open && !loading) {
      setSelectedAction(null);
    }
  }}
>
<AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
  <AlertDialogHeader>
    <AlertDialogTitle>
      Confirmar cambio de estado
    </AlertDialogTitle>

    <AlertDialogDescription>
      ¿Seguro que deseas realizar la acción
      "{selectedAction?.label}" sobre esta publicación?
    </AlertDialogDescription>
  </AlertDialogHeader>

  {isFraudValidation && (
    <div className="space-y-4 py-2">
      <div>
        <h3 className="text-sm font-semibold">
          Autoridades asociadas
        </h3>

        <p className="mt-1 text-xs text-muted-foreground">
          Ordénalas de mayor a menor prioridad.
          La primera autoridad tendrá la prioridad más alta.
        </p>
      </div>

      <AuthoritySortableList
        authorityIds={selectedAuthorityIds}
        availableAuthorities={availableAuthorities}
        onChange={setSelectedAuthorityIds}
        disabled={loading}
      />

      <div className="flex gap-2">
        <select
          aria-label="Seleccionar autoridad"
          className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
          value={authorityToAdd}
          disabled={loading || remainingAuthorities.length === 0}
          onChange={(event) => setAuthorityToAdd(event.target.value)}
        >
          <option value="">
            Seleccionar autoridad
          </option>

          {remainingAuthorities.map((authority) => (
            <option
              key={authority.id}
              value={authority.id}
            >
              {authority.name}
            </option>
          ))}
        </select>

        <Button
          type="button"
          variant="outline"
          disabled={!authorityToAdd || loading}
          onClick={addAuthority}
        >
          <Plus className="mr-1 size-4" />
          Agregar
        </Button>
      </div>
    </div>
  )}

  {error && (
    <p role="alert" className="text-sm text-destructive">
      {error}
    </p>
  )}

  <AlertDialogFooter>
    <AlertDialogCancel disabled={loading}>
      Cancelar
    </AlertDialogCancel>

    <AlertDialogAction
      disabled={loading}
      onClick={(event) => {
        event.preventDefault();
        void confirmAction();
      }}
    >
      {loading ? "Guardando..." : "Confirmar"}
    </AlertDialogAction>
  </AlertDialogFooter>
</AlertDialogContent>
</AlertDialog>
    </div>
  );
}
