"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthoritySortableList } from "./authority-sortable-list";

type Authority = {
  id: number;
  name: string;
  code?: string;
  description?: string;
};

type Props = {
  postId: number;
  authorityIds: number[];
  availableAuthorities: Authority[];
  canEdit: boolean;
  onUpdated: () => void;
};

export function PostAuthorities({
  postId,
  authorityIds,
  availableAuthorities,
  canEdit,
  onUpdated,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<number[]>(authorityIds);
  const [selectedAuthority, setSelectedAuthority] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedIds(authorityIds);
  }, [authorityIds]);

  const remainingAuthorities = availableAuthorities.filter(
    (authority) => !selectedIds.includes(authority.id)
  );

  const hasChanges =
    JSON.stringify(selectedIds) !== JSON.stringify(authorityIds);

  function addAuthority() {
    if (!selectedAuthority) return;

    const id = Number(selectedAuthority);

    if (!selectedIds.includes(id)) {
      setSelectedIds((current) => [...current, id]);
    }

    setSelectedAuthority("");
  }

  function removeAuthority(id: number) {
    setSelectedIds((current) =>
      current.filter((authorityId) => authorityId !== id)
    );
  }

  function moveAuthority(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= selectedIds.length) return;

    setSelectedIds((current) => {
      const updated = [...current];

      [updated[index], updated[nextIndex]] = [
        updated[nextIndex],
        updated[index],
      ];

      return updated;
    });
  }

  async function saveAuthorities() {
    if (!canEdit || !hasChanges || saving) return;

    setSaving(true);

    try {
      await api.patch(`/posts/${postId}`, {
        authorities: selectedIds,
      });

      toast.success("Autoridades actualizadas correctamente");
      onUpdated();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message;

        toast.error(
          typeof message === "string"
            ? message
            : "No fue posible actualizar las autoridades."
        );
      } else {
        toast.error("Ocurrió un error inesperado.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Autoridades recomendadas</CardTitle>
        <CardDescription>
          {canEdit
            ? "Selecciona las autoridades y establece su prioridad."
            : "Autoridades asociadas a esta publicación."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {selectedIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay autoridades recomendadas.
          </p>
        ) : (
          <AuthoritySortableList
            authorityIds={selectedIds}
            availableAuthorities={availableAuthorities}
            onChange={setSelectedIds}
            disabled={saving || !canEdit}
          />
        )}

        {canEdit && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex gap-2">
              <Select
                value={selectedAuthority}
                onValueChange={setSelectedAuthority}
                disabled={saving || remainingAuthorities.length === 0}
              >
                <SelectTrigger className="min-w-0 flex-1">
                  <SelectValue placeholder="Seleccionar autoridad" />
                </SelectTrigger>

                <SelectContent>
                  {remainingAuthorities.map((authority) => (
                    <SelectItem
                      key={authority.id}
                      value={String(authority.id)}
                    >
                      {authority.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                disabled={!selectedAuthority || saving}
                onClick={addAuthority}
              >
                <Plus className="mr-1 size-4" />
                Agregar
              </Button>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!hasChanges || saving}
                onClick={() => {
                  setSelectedIds(authorityIds);
                  setSelectedAuthority("");
                }}
              >
                Cancelar
              </Button>

              <Button
                type="button"
                disabled={!hasChanges || saving}
                onClick={() => void saveAuthorities()}
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
