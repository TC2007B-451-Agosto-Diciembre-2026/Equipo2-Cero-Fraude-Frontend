
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

export function UserDetail({ userId }: Props) {
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

    const nextStatus = !Boolean(user.is_active);

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
            ? "Cuenta activada correctamente"
            : "Cuenta desactivada correctamente"
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
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href="/users">
            <ArrowLeft className="mr-2 size-4" />
            Volver a usuarios
          </Link>
        </Button>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <p role="alert" className="text-sm text-destructive">
              {error ?? "No se encontró el usuario."}
            </p>

            <Button variant="outline" onClick={() => void loadUser()}>
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
      <Button variant="ghost" asChild>
        <Link href="/users">
          <ArrowLeft className="mr-2 size-4" />
          Volver a usuarios
        </Link>
      </Button>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <UserRound className="size-7 text-muted-foreground" />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">
            {user.username}
          </h1>

          <p className="break-all text-sm text-muted-foreground">
            {user.email}
          </p>
        </div>

        <Badge variant={isActive ? "default" : "secondary"}>
          {isActive ? "Activo" : "Inactivo"}
        </Badge>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Resumen de actividad</CardTitle>
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
                <p className="mt-2 text-sm font-medium">
                  Pendiente de consulta
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">
                  Reportes recibidos
                </p>
                <p className="mt-2 text-sm font-medium">
                  Dato no disponible
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-5" />
                Publicaciones creadas
              </CardTitle>

              <CardDescription>
                Publicaciones registradas por este usuario.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Pendiente de conectar la consulta de publicaciones
                  de este usuario.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-5" />
                Administración de cuenta
              </CardTitle>

              <CardDescription>
                Información y acciones administrativas.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  Estado
                </span>

                <Badge variant={isActive ? "default" : "secondary"}>
                  {isActive ? "Activa" : "Inactiva"}
                </Badge>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">
                  Rol
                </span>

                <span className="text-sm font-medium">
                  {user.role_id === 1
                    ? "Administrador"
                    : `Rol ${user.role_id}`}
                </span>
              </div>

              <div className="space-y-2 border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  {isActive
                    ? "Puedes desactivar esta cuenta para impedir su acceso."
                    : "Puedes reactivar esta cuenta para permitir nuevamente su acceso."}
                </p>

                
                <Button
                variant="outline"
                className={
                    isActive
                    ? "w-full text-destructive hover:text-destructive"
                    : "w-full"
                }
                disabled={saving || currentUserId === null || isOwnAccount}
                onClick={() => setConfirmOpen(true)}
                >
                {isOwnAccount
                    ? "No puedes modificar tu propia cuenta"
                    : isActive
                    ? "Desactivar cuenta"
                    : "Activar cuenta"}
                </Button>


                <p className="text-xs text-muted-foreground">
                  La acción se habilitará al confirmar los
                  campos de UpdateUserDto.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    
<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>
        {isActive
          ? "¿Desactivar esta cuenta?"
          : "¿Activar esta cuenta?"}
      </AlertDialogTitle>

      <AlertDialogDescription>
        {isActive
          ? `Se desactivará la cuenta de ${user.username}.`
          : `Se activará nuevamente la cuenta de ${user.username}.`}
      </AlertDialogDescription>
    </AlertDialogHeader>

    <AlertDialogFooter>
      <AlertDialogCancel disabled={saving}>
        Cancelar
      </AlertDialogCancel>

      <AlertDialogAction
        disabled={saving}
        onClick={(event) => {
          event.preventDefault();
          void toggleUserStatus();
        }}
      >
        {saving
          ? "Guardando..."
          : isActive
            ? "Desactivar cuenta"
            : "Activar cuenta"}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
</>
  );
}
