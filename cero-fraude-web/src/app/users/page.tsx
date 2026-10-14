
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";

import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type User = {
  id: string;
  username: string;
  email: string;
  is_active: boolean | number;
  role_id: number;
  created_at?: string;
};

type UsersResponse = {
  data: User[];
  page: number;
  total_pages: number;
  total: number;
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

  return "No fue posible obtener los usuarios.";
}

export default function UsersPage() {
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadUsers = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number | boolean> = {
        page,
      };

      if (statusFilter !== "all") {
        params.is_active = statusFilter === "active";
      }

      if (roleFilter !== "all") {
        params.role_id = Number(roleFilter);
      }

      const response = await api.get<UsersResponse>("/users", {
        params,
        signal,
      });

      if (signal.aborted) return;

      setUsers(response.data.data);
      setTotalPages(response.data.total_pages);
      setTotal(response.data.total);
    } catch (error) {
      if (signal.aborted || axios.isCancel(error)) return;

      setUsers([]);
      setError(getErrorMessage(error));
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, [page, statusFilter, roleFilter]);

  useEffect(() => {
    const controller = new AbortController();

    void loadUsers(controller.signal);

    return () => controller.abort();
  }, [loadUsers, refreshKey]);

  function refreshUsers() {
    setRefreshKey((current) => current + 1);
  }

  function changeStatus(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  function changeRole(value: string) {
    setRoleFilter(value);
    setPage(1);
  }

  const filteredUsers = users.filter((user) => {
    const text = search.trim().toLowerCase();

    return (
      user.username.toLowerCase().includes(text) ||
      user.email.toLowerCase().includes(text)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Administración de usuarios
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Consulta las cuentas registradas y administra sus estados.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={refreshUsers}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-2 size-4 ${
              loading ? "animate-spin" : ""
            }`}
          />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar en esta página por usuario o correo..."
                className="pl-9"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={changeStatus}
            >
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  Todos los estados
                </SelectItem>
                <SelectItem value="active">
                  Activos
                </SelectItem>
                <SelectItem value="inactive">
                  Inactivos
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={roleFilter}
              onValueChange={changeRole}
            >
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">
                  Todos los roles
                </SelectItem>
                <SelectItem value="2">
                  Administradores
                </SelectItem>
                <SelectItem value="1">
                  Usuarios
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Correo electrónico</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">
                    Detalle
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: 5 }).map((_, cell) => (
                        <TableCell key={cell}>
                          <Skeleton className="h-5 w-full max-w-40" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center">
                      <p role="alert" className="text-sm text-destructive">
                        {error}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={refreshUsers}
                      >
                        Reintentar
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center">
                      <Users className="mx-auto mb-3 size-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        No se encontraron usuarios.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const isActive = Boolean(user.is_active);

                    return (
                      <TableRow
                        key={user.id}
                        tabIndex={0}
                        role="link"
                        aria-label={`Ver detalle de ${user.username}`}
                        className="cursor-pointer hover:bg-muted/50 focus-visible:bg-muted"
                        onClick={() =>
                          router.push(`/users/${user.id}`)
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" ||
                            event.key === " "
                          ) {
                            event.preventDefault();
                            router.push(`/users/${user.id}`);
                          }
                        }}
                      >
                        <TableCell className="font-medium">
                          {user.username}
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          {user.email}
                        </TableCell>

                        <TableCell>
                          {user.role_id === 2
                            ? "Administrador"
                            : user.role_id === 1
                              ? "Usuario"
                              : `Rol ${user.role_id}`}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={isActive ? "default" : "secondary"}
                          >
                            {isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <ChevronRight className="ml-auto size-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Cargando usuarios..."
                : `${total} usuarios en el filtro · ${filteredUsers.length} visibles en esta página`}
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
                onClick={() =>
                  setPage((current) => current + 1)
                }
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            La búsqueda por nombre o correo se aplica únicamente
            a la página actual. Los filtros de estado y rol
            consultan el backend.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
