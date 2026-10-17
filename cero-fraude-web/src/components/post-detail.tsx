
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
import { PageHeader } from "@/components/page-header";
import { PostManagement } from "@/components/post-management";
import {
  PostStatusBadge,
  type PostStatusCode,
} from "@/components/post-status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PostEvidenceManager } from "@/components/post-evidence-manager";
import { PostAuthorities } from "@/components/post-authorities";
import { PostReports } from "@/components/post-reports";

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

function formatDate(value: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isEmpty(value: React.ReactNode) {
  return value === null || value === undefined || value === "";
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-slate-900">
        {isEmpty(value) ? "No disponible" : value}
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
        <BackLink />
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
  )?.code as PostStatusCode | undefined;

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

  // Optional details. The ones without data are grouped at the end so the
  // card isn't a list of "No disponible".
  const details: { label: string; value: React.ReactNode }[] = [
    { label: "Vendedor", value: post.seller_name },
    { label: "Producto", value: post.product },
    { label: "Plataforma", value: post.platform },
    { label: "Teléfono", value: post.phone_number },
    { label: "Correo fraudulento", value: post.fraudulent_email },
    { label: "Fecha de publicación", value: formatDate(post.published_at) },
    { label: "Enlace original", value: post.url },
  ];
  const filledDetails = details.filter((detail) => !isEmpty(detail.value));
  const emptyDetails = details.filter((detail) => isEmpty(detail.value));

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <BackLink />

        <PageHeader
          title={post.title || "Publicación sin título"}
          description={
            <span className="flex flex-wrap items-center gap-2">
              <span>
                Publicación #{post.id}
                {post.author ? ` · por ${post.author}` : ""}
              </span>
              <PostStatusBadge
                code={statusCode}
                fallback={`Estado #${post.status_id}`}
              />
            </span>
          }
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información general</CardTitle>
            </CardHeader>

            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <InfoField
                    label="Descripción"
                    value={post.description}
                  />
                </div>

                <InfoField label="Categoría" value={categoryName} />

                <div>
                  <dt className="text-xs text-muted-foreground">
                    Tipos de fraude
                  </dt>
                  <dd className="mt-1 flex flex-wrap gap-2">
                    {post.types.length === 0 ? (
                      <span className="text-sm font-medium text-slate-900">
                        Sin tipos asociados
                      </span>
                    ) : (
                      post.types.map((id) => (
                        <Badge key={id} variant="outline">
                          {getTypeName(id)}
                        </Badge>
                      ))
                    )}
                  </dd>
                </div>

                {filledDetails.map((detail) => (
                  <InfoField
                    key={detail.label}
                    label={detail.label}
                    value={detail.value}
                  />
                ))}
              </dl>

              {emptyDetails.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-slate-700">
                    {emptyDetails.length}{" "}
                    {emptyDetails.length === 1
                      ? "campo sin datos"
                      : "campos sin datos"}
                  </summary>
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                    {emptyDetails.map((detail) => (
                      <li key={detail.label}>{detail.label}</li>
                    ))}
                  </ul>
                </details>
              )}
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

          <PostReports postId={post.id} />
        </div>

        <div className="space-y-4">
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserRound
                  className="size-4 text-slate-700"
                  aria-hidden="true"
                />
                Autor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Usuario</span>
                <span className="font-medium text-slate-900">
                  {post.author ?? "Anónimo"}
                </span>
              </div>

              {post.is_anonymous !== undefined && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    Publicación anónima
                  </span>
                  <span className="font-medium text-slate-900">
                    {post.is_anonymous ? "Sí" : "No"}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare
                  className="size-4 text-slate-700"
                  aria-hidden="true"
                />
                Interacciones
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-6 text-sm text-slate-900">
              <span className="flex items-center gap-2">
                <ThumbsUp
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="tabular-nums">{post.reactions.like}</span>
                <span className="sr-only">me gusta</span>
              </span>
              <span className="flex items-center gap-2">
                <ThumbsDown
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="tabular-nums">
                  {post.reactions.dislike}
                </span>
                <span className="sr-only">no me gusta</span>
              </span>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/posts"
      className="inline-flex items-center gap-1 text-sm text-slate-700 hover:text-slate-900"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Publicaciones
    </Link>
  );
}
