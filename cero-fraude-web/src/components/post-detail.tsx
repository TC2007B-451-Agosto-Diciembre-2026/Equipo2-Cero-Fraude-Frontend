
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import {
  ArrowLeft,
  FileImage,
  MessageSquare,
  UserRound,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

import { api } from "@/lib/api";
import { PostManagement } from "@/components/post-management";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PostEvidenceManager } from "@/components/post-evidence-manager";
import { PostAuthorities } from "@/components/post-authorities";

type PostStatus =
  | "DRAFT"
  | "UPLOADED"
  | "PUBLISHED"
  | "VALIDATED"
  | "REJECTED";

type CatalogItem = {
  id: number;
  name: string;
  code?: string;
};

type Evidence = {
  id: number;
  url: string;
  evidence_type_id: number;
  post_id: number;
  created_at: string;
  is_visible?: boolean | number;
};

type PostComment = {
  id: number;
  user: string;
  post: number;
  text: string;
  created_at: string;
  is_visible?: boolean | number;
};

type Post = {
  id: number;
  title: string | null;
  description: string | null;
  seller_name: string | null;
  product: string | null;
  phone_number: string | null;
  url: string | null;
  platform: string | null;
  fraudulent_email: string | null;
  status_id: number;
  is_fraud: boolean | null;
  published_at: string | null;
  author: string | null;
  category: number | null;
  types: number[];
  reactions: {
    like: number;
    dislike: number;
  };
  evidences: Evidence[];
  comments: PostComment[];
  authorities: number[];
  is_anonymous?: boolean;
  deleted_at?: string | null;
};

type Props = {
  postId: number;
};

const statusLabels: Record<PostStatus, string> = {
  DRAFT: "Borrador",
  UPLOADED: "Subida",
  PUBLISHED: "Publicada",
  VALIDATED: "Validada",
  REJECTED: "Rechazada",
};

function formatDate(value: string | null) {
  if (!value) return "No disponible";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "No disponible";

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-medium">
        {value === null || value === undefined || value === ""
          ? "No disponible"
          : value}
      </dd>
    </div>
  );
}

export function PostDetail({ postId }: Props) {
  const [post, setPost] = useState<Post | null>(null);
  const [states, setStates] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogItem[]>([]);
  const [types, setTypes] = useState<CatalogItem[]>([]);
  const [authorities, setAuthorities] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPost() {
      setLoading(true);
      setError(null);
      setPost(null);

      try {
        const [
          postResponse,
          statesResponse,
          categoriesResponse,
          typesResponse,
        ] = await Promise.all([
          api.get<Post>(`/posts/${postId}`),
          api.get<CatalogItem[]>("/states"),
          api.get<CatalogItem[]>("/categories"),
          api.get<CatalogItem[]>("/types"),
        ]);

        // Las autoridades son un catálogo exclusivo
        // para administradores.
        const authoritiesResponse = await api
          .get<CatalogItem[]>("/authorities")
          .catch(() => null);

        if (!active) return;

        setPost(postResponse.data);
        setStates(statesResponse.data);
        setCategories(categoriesResponse.data);
        setTypes(typesResponse.data);
        setAuthorities(authoritiesResponse?.data ?? []);
      } catch (err) {
        if (!active) return;

        if (axios.isAxiosError(err)) {
          if (err.response?.status === 401) {
            setError("Necesitas iniciar sesión para consultar la publicación.");
          } else if (err.response?.status === 403) {
            setError("No tienes permisos para consultar esta publicación.");
          } else if (err.response?.status === 404) {
            setError("La publicación no existe.");
          } else {
            setError("No fue posible cargar la publicación.");
          }
        } else {
          setError("Ocurrió un error al consultar el backend.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (Number.isInteger(postId) && postId > 0) {
      void loadPost();
    } else {
      setError("Identificador de publicación inválido.");
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [postId, refreshKey]);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="space-y-5">
        <Button variant="ghost" asChild>
          <Link href="/posts">
            <ArrowLeft className="mr-2 size-4" />
            Volver a publicaciones
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-center">
            <p role="alert" className="text-sm text-destructive">
              {error ?? "No se encontró la publicación."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusCode = states.find(
    (state) => state.id === post.status_id
  )?.code as PostStatus | undefined;

  const categoryName = categories.find(
    (category) => category.id === post.category
  )?.name;

  const getTypeName = (id: number) =>
    types.find((type) => type.id === id)?.name ?? `Tipo #${id}`;

  const getAuthorityName = (id: number) =>
    authorities.find((authority) => authority.id === id)?.name ??
    `Autoridad #${id}`;

  const statusIds = {
    PUBLISHED: states.find((state) => state.code === "PUBLISHED")?.id,
    VALIDATED: states.find((state) => state.code === "VALIDATED")?.id,
    REJECTED: states.find((state) => state.code === "REJECTED")?.id,
  };

  function refreshPost() {
  setRefreshKey((current) => current + 1);
}

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild className="px-0">
        <Link href="/posts">
          <ArrowLeft className="mr-2 size-4" />
          Volver a publicaciones
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {post.title || "Publicación sin título"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Publicación #{post.id}
          </p>
        </div>

        <Badge variant="outline">
          {statusCode
            ? statusLabels[statusCode]
            : `Estado #${post.status_id}`}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Información general</CardTitle>
              <CardDescription>
                Información registrada en la publicación.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <InfoField
                label="Descripción"
                value={post.description}
              />

              <Separator />

              <dl className="grid gap-5 sm:grid-cols-2">
                <InfoField
                  label="Vendedor"
                  value={post.seller_name}
                />
                <InfoField
                  label="Producto"
                  value={post.product}
                />
                <InfoField
                  label="Plataforma"
                  value={post.platform}
                />
                <InfoField
                  label="Categoría"
                  value={categoryName}
                />
                <InfoField
                  label="Teléfono"
                  value={post.phone_number}
                />
                <InfoField
                  label="Correo fraudulento"
                  value={post.fraudulent_email}
                />
                <InfoField
                  label="Fecha de publicación"
                  value={formatDate(post.published_at)}
                />
                <InfoField
                  label="Enlace original"
                  value={post.url}
                />
              </dl>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Tipos de fraude
                </p>
                <div className="flex flex-wrap gap-2">
                  {post.types.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Sin tipos asociados.
                    </p>
                  ) : (
                    post.types.map((id) => (
                      <Badge key={id} variant="outline">
                        {getTypeName(id)}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <PostEvidenceManager
            postId={post.id}
            evidences={post.evidences}
            onUpdated={refreshPost}
            canManage={
              statusCode === "UPLOADED" ||
              statusCode === "PUBLISHED" ||
              statusCode === "VALIDATED"
            }
          />

          <Card>
            <CardHeader>
              <CardTitle>Reportes recibidos</CardTitle>
              <CardDescription>
                Información proporcionada por otros usuarios.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                La consulta de reportes estará disponible
                cuando se implemente GET /posts/:postId/reports.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-5 text-emerald-700" />
                Interacciones
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-6">
              <div className="flex items-center gap-2">
                <ThumbsUp className="size-4" />
                <span>{post.reactions.like}</span>
              </div>
              <div className="flex items-center gap-2">
                <ThumbsDown className="size-4" />
                <span>{post.reactions.dislike}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-5 text-emerald-700" />
                Autor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoField
                label="Usuario"
                value={post.author}
              />
              {post.is_anonymous !== undefined && (
                <InfoField
                  label="Publicación anónima"
                  value={post.is_anonymous ? "Sí" : "No"}
                />
              )}
            </CardContent>
          </Card>

          {statusCode && statusCode !== "DRAFT" && (
            <PostManagement
              key={post.id}
              postId={post.id}
              initialStatus={statusCode}
              initialIsFraud={post.is_fraud}
              initialComments={post.comments}
              initialAuthorityIds={post.authorities ?? []}
              availableAuthorities={authorities}
              statusIds={statusIds}
              onUpdated={refreshPost}
            />
          )}

          {statusCode === "VALIDATED" && post.is_fraud === true && (
            <PostAuthorities
              postId={post.id}
              authorityIds={post.authorities ?? []}
              availableAuthorities={authorities}
              canEdit={true}
              onUpdated={refreshPost}
            />
          )}
        </div>
      </div>
    </div>
  );
}
