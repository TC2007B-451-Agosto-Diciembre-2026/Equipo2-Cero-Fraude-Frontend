"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  RefreshCw,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

import { api } from "@/lib/api";
import {
  formatUserDate,
  getRoleIdByCode,
  type Role,
  type User,
  type UsersResponse,
} from "@/lib/users";
import { CreateAdminDialog } from "@/components/create-admin-dialog";
import { PageHeader } from "@/components/page-header";
import { UserStatusBadge } from "@/components/user-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;

    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.join(", ");
  }

  if (error instanceof Error) return error.message;

  return "No fue posible cargar los administradores.";
}

export default function AdministrationPage() {
  const [admins, setAdmins] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  // `loading` is derived from the request key (same pattern as
  // post-reports.tsx), so the effect never calls setLoading(true).
  const requestKey = `${page}-${refreshKey}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== requestKey;

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    Promise.all([
      api.get<Role[]>("/roles", { signal }),
      api.get<User>("/users/me", { signal }),
    ])
      .then(([rolesResponse, meResponse]) => {
        const adminRoleId = getRoleIdByCode(rolesResponse.data, "ADMIN");

        if (adminRoleId === null) {
          throw new Error("No se encontró el rol de administrador.");
        }

        setCurrentUserId(meResponse.data.id);

        return api.get<UsersResponse>("/users", {
          params: { role_id: adminRoleId, page },
          signal,
        });
      })
      .then((response) => {
        setAdmins(response.data.data);
        setTotalPages(Math.max(1, response.data.total_pages));
        setTotal(response.data.total);
        setError(null);
      })
      .catch((error) => {
        if (signal.aborted || axios.isCancel(error)) return;

        setAdmins([]);
        setError(getErrorMessage(error));
      })
      .finally(() => {
        if (!signal.aborted) setLoadedKey(requestKey);
      });

    return () => controller.abort();
  }, [page, requestKey]);

  function refresh() {
    setRefreshKey((current) => current + 1);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administración"
        description="Administradores del panel. Aquí puedes registrar nuevas cuentas de administrador."
      >
        <Button variant="outline" onClick={refresh} disabled={loading}>
          <RefreshCw
            data-icon="inline-start"
            className={loading ? "animate-spin" : ""}
          />
          Actualizar
        </Button>

        <Button
          onClick={() => setCreateOpen(true)}
          disabled={loading || error !== null}
        >
          <UserPlus data-icon="inline-start" />
          Agregar administrador
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="flex flex-col gap-4">
          {loading ? (
            <div
              className="flex flex-col gap-3"
              aria-busy="true"
              aria-label="Cargando"
            >
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div
              role="alert"
              className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10 text-center"
            >
              <CircleAlert className="size-6 text-red-700" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  No se pudieron cargar los administradores.
                </p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={refresh}>
                Reintentar
              </Button>
            </div>
          ) : admins.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-10 text-center">
              <ShieldCheck
                className="size-6 text-muted-foreground"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Aún no hay administradores
                </p>
                <p className="text-xs text-muted-foreground">
                  Registra a la primera persona para que pueda moderar.
                </p>
              </div>
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <UserPlus data-icon="inline-start" />
                Agregar administrador
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {total} {total === 1 ? "administrador" : "administradores"}
              </p>

              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Alta</TableHead>
                      <TableHead className="w-px">
                        <span className="sr-only">Acciones</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {admins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell>
                          <div className="flex items-center gap-2 font-medium text-slate-900">
                            {admin.username}
                            {admin.id === currentUserId && (
                              <Badge variant="outline">Tú</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {admin.email}
                          </div>
                        </TableCell>

                        <TableCell>
                          <UserStatusBadge
                            active={Boolean(admin.is_active)}
                            feminine
                          />
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-slate-700">
                          {formatUserDate(admin.created_at)}
                        </TableCell>

                        <TableCell className="text-right">
                          <Link
                            href={`/users/${admin.id}`}
                            className="text-sm font-medium whitespace-nowrap text-emerald-800 hover:underline"
                            aria-label={`Ver usuario ${admin.username}`}
                          >
                            Ver usuario
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2">
                  <span className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Página anterior"
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Página siguiente"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Para quitar el rol de administrador o dárselo a una
                cuenta existente, abre su detalle desde Usuarios.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <CreateAdminDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refresh}
      />
    </div>
  );
}
