"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { toast } from "sonner";
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

import { api } from "@/lib/api";
import { UserStatusBadge } from "@/components/user-status-badge";
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

type User = {
  id: string;
  username: string;
  email: string;
  is_active: boolean | number;
  role_id: number;
  created_at?: string;
};

type Props = {
  userId: string;
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

  return "No fue posible consultar el usuario.";
}

function formatDate(value: string | undefined) {
  if (!value) return "No disponible";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "No disponible";

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
  }).format(date);
}

function BackLink() {
  return (
    <Link
      href="/users"
      className="inline-flex items-center gap-1 text-sm text-slate-700 hover:text-slate-900"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Volver a usuarios
    </Link>
  );
}

export function UserDetail({ userId }: Readonly<Props>) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get<User>(`/users/${userId}`);
      setUser(response.data);
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  async function toggleUserStatus() {
    if (!user || saving || currentUserId === null || currentUserId === user.id) {
      return;
    }

    const nextStatus = !user.is_active;

    setSaving(true);

    try {
      const response = await api.patch<User>(
        `/users/${user.id}`,
        {
          is_active: nextStatus,
        }
      );

      setUser(response.data);
      setConfirmOpen(false);

      toast.success(
        nextStatus
          ? `${user.username} activado`
          : `${user.username} desactivado`
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const response = await api.get<{ id: string }>("/users/me");
        setCurrentUserId(response.data.id);
      } catch {
        setCurrentUserId(null);
      }
    }

    void loadCurrentUser();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-72" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <BackLink />

        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p role="alert" className="text-sm text-destructive">
              {error ?? "No se encontró el usuario."}
            </p>

            <Button variant="outline" size="sm" onClick={() => void loadUser()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isActive = Boolean(user.is_active);
  const isOwnAccount = currentUserId === user.id;

  return (
    <>
      <div className="space-y-6">
        <div className="space-y-3">
          <BackLink />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div
                aria-hidden="true"
                className="flex size-14 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700"
              >
                <UserRound className="size-6" />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900">
                  {user.username}
                  {isOwnAccount && (
                    <Badge variant="outline" className="ml-2 align-middle">
                      Tú
                    </Badge>
                  )}
                </h1>

                <p className="break-all text-sm text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>

            <UserStatusBadge active={isActive} />
          </div>
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumen de actividad</CardTitle>
                <CardDescription>
                  Actividad relacionada con las publicaciones
                  creadas por este usuario.
                </CardDescription>
              </CardHeader>

              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">
                    Publicaciones creadas
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    Dato no disponible
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">
                    Reportes recibidos
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    Dato no disponible
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText
                    className="size-4 text-slate-700"
                    aria-hidden="true"
                  />
                  Publicaciones creadas
                </CardTitle>

                <CardDescription>
                  Publicaciones registradas por este usuario.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  El backend todavía no permite filtrar publicaciones
                  por autor.
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck
                  className="size-4 text-slate-700"
                  aria-hidden="true"
                />
                Administración de cuenta
              </CardTitle>

              <CardDescription>
                Información y acciones administrativas.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Estado</span>
                <UserStatusBadge active={isActive} />
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Rol</span>
                <span className="font-medium text-slate-900">
                  {user.role_id === 2
                    ? "Administrador"
                    : user.role_id === 1
                      ? "Usuario"
                      : `Rol ${user.role_id}`}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Registro</span>
                <span className="font-medium text-slate-900">
                  {formatDate(user.created_at)}
                </span>
              </div>

              <div className="space-y-2 border-t pt-4">
                <p className="text-sm text-slate-700">
                  {isOwnAccount
                    ? "No puedes cambiar el estado de tu propia cuenta."
                    : isActive
                      ? "Puedes desactivar esta cuenta para impedir su acceso."
                      : "Puedes activar esta cuenta para devolverle el acceso."}
                </p>

                <Button
                  variant="outline"
                  className={
                    isActive
                      ? "w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                      : "w-full"
                  }
                  disabled={saving || currentUserId === null || isOwnAccount}
                  onClick={() => setConfirmOpen(true)}
                >
                  {isActive ? "Desactivar cuenta" : "Activar cuenta"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isActive
                ? `¿Desactivar a ${user.username}?`
                : `¿Activar a ${user.username}?`}
            </AlertDialogTitle>

            <AlertDialogDescription>
              {isActive
                ? "No podrá iniciar sesión hasta que lo vuelvas a activar. Sus publicaciones se conservan."
                : "Podrá volver a iniciar sesión."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>
              Cancelar
            </AlertDialogCancel>

            <AlertDialogAction
              disabled={saving}
              className={
                isActive
                  ? "bg-destructive text-white hover:bg-destructive/90"
                  : undefined
              }
              onClick={(event) => {
                event.preventDefault();
                void toggleUserStatus();
              }}
            >
              {saving
                ? "Guardando..."
                : isActive
                  ? "Desactivar"
                  : "Activar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
