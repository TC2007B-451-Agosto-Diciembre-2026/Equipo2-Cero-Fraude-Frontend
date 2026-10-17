
"use client";

import { useState } from "react";
import axios from "axios";
import { api } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  Plus,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import {
  PostStatusBadge,
  type PostStatusCode,
} from "@/components/post-status-badge";
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
  icon: typeof ThumbsUp;
  variant: "default" | "outline";
  className: string;
};

// Positive actions use the brand fill, the ones that mark something as bad
// use a red outline (never a red fill, so they don't look like the default).
const primaryActionClass =
  "bg-emerald-700 text-white hover:bg-emerald-800";
const negativeActionClass =
  "border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800";


type Props = {
  postId: number;
  initialStatus: PostStatusCode;
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
    icon: ThumbsUp,
    variant: "default",
    className: primaryActionClass,
    });
}

if (statusIds.REJECTED !== undefined) {
    availableActions.push({
    label: "Rechazar",
    statusId: statusIds.REJECTED,
    icon: ThumbsDown,
    variant: "outline",
    className: negativeActionClass,
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
        icon: ShieldAlert,
        variant: "outline",
        className: negativeActionClass,
    },
    {
        label: "Validar como no fraude",
        statusId: statusIds.VALIDATED,
        isFraud: false,
        icon: CheckCircle2,
        variant: "outline",
        className: "",
    }
    );
}

if (statusIds.REJECTED !== undefined) {
    availableActions.push({
    label: "Rechazar",
    statusId: statusIds.REJECTED,
    icon: ThumbsDown,
    variant: "outline",
    className: negativeActionClass,
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
) as PostStatusCode | undefined;

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
          <CardTitle className="text-base">Moderación</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Estado actual</span>
            <PostStatusBadge code={status} />
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Validación</span>
            <span className="font-medium text-slate-900">
              {isFraud === null
                ? "Sin validar"
                : isFraud
                  ? "Fraude"
                  : "No fraude"}
            </span>
          </div>

          {availableActions.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs text-muted-foreground">
                {status === "UPLOADED"
                  ? "Revisa la publicación antes de publicarla."
                  : "Clasifica esta publicación tras revisarla."}
              </p>

              {availableActions.map((action) => (
                <Button
                  key={action.label}
                  variant={action.variant}
                  className={`w-full ${action.className}`}
                  disabled={loading}
                  onClick={() => openAction(action)}
                >
                  <action.icon data-icon="inline-start" />
                  {action.label}
                </Button>
              ))}
            </div>
          )}

          {status === "REJECTED" && (
            <p className="text-sm text-red-700">
              Esta publicación fue rechazada. Es un estado final.
            </p>
          )}

          {status === "VALIDATED" && (
            <p className="text-xs text-muted-foreground">
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
          <CardTitle className="text-base">
            Comentarios administrativos
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay comentarios.
            </p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-md bg-slate-100 p-3 text-sm text-slate-900"
              >
                <p className="text-xs text-muted-foreground">
                  {comment.user} ·{" "}
                  {new Date(comment.created_at).toLocaleString("es-MX", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>

                <p className="mt-1 break-words">{comment.text}</p>

                {comment.is_visible !== undefined &&
                  !comment.is_visible && (
                    <Badge variant="outline" className="mt-2">
                      Oculto
                    </Badge>
                  )}
              </div>
            ))
          )}

          <div className="space-y-2 border-t pt-3">
            <Label htmlFor="comment-text">Nuevo comentario</Label>

            <Textarea
              id="comment-text"
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Escribe una nota interna…"
              rows={3}
            />

            <Button
              className="w-full"
              disabled={!commentText.trim() || loading}
              onClick={submitComment}
            >
              {loading ? "Guardando..." : "Publicar comentario"}
            </Button>
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
