"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Authority = {
  id: number;
  name: string;
};

type Props = {
  authorityIds: number[];
  availableAuthorities: Authority[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
};

function SortableAuthority({
  id,
  index,
  name,
  onRemove,
  disabled,
}: {
  id: number;
  index: number;
  name: string;
  onRemove: () => void;
  disabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex items-center gap-3 rounded-lg border bg-background p-3 ${
        isDragging ? "z-10 opacity-60 shadow-lg" : ""
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        disabled={disabled}
        className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing disabled:cursor-not-allowed"
        aria-label={`Mover ${name}`}
      >
        <GripVertical className="size-5" />
      </button>

      <Badge variant="secondary">{index + 1}</Badge>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{name}</p>
        {index === 0 && (
          <p className="text-xs text-emerald-700">
            Mayor prioridad
          </p>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={onRemove}
        aria-label={`Quitar ${name}`}
        className="text-destructive"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

export function AuthoritySortableList({
  authorityIds,
  availableAuthorities,
  onChange,
  disabled = false,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = authorityIds.indexOf(Number(active.id));
    const newIndex = authorityIds.indexOf(Number(over.id));

    if (oldIndex < 0 || newIndex < 0) return;

    onChange(arrayMove(authorityIds, oldIndex, newIndex));
  }

  if (authorityIds.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        No hay autoridades seleccionadas.
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={authorityIds}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {authorityIds.map((id, index) => {
            const authority = availableAuthorities.find(
              (item) => item.id === id
            );

            return (
              <SortableAuthority
                key={id}
                id={id}
                index={index}
                name={authority?.name ?? `Autoridad #${id}`}
                disabled={disabled}
                onRemove={() =>
                  onChange(
                    authorityIds.filter(
                      (authorityId) => authorityId !== id
                    )
                  )
                }
              />
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
