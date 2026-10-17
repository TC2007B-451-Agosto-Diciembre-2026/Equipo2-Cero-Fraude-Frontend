import { Badge } from "@/components/ui/badge";

// Post states are resolved by `code` from GET /states, never by ID.
export type PostStatusCode =
  | "DRAFT"
  | "UPLOADED"
  | "PUBLISHED"
  | "VALIDATED"
  | "REJECTED";

export const postStatusLabels: Record<PostStatusCode, string> = {
  DRAFT: "Borrador",
  UPLOADED: "Subida",
  PUBLISHED: "Publicada",
  VALIDATED: "Validada",
  REJECTED: "Rechazada",
};

// Same colors in badges and charts: amber = waiting for review,
// blue = public but not validated, emerald = validated, red = rejected.
export const postStatusStyles: Record<PostStatusCode, string> = {
  DRAFT: "bg-slate-100 text-slate-800",
  UPLOADED: "bg-amber-100 text-amber-800",
  PUBLISHED: "bg-blue-100 text-blue-800",
  VALIDATED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
};

function isPostStatusCode(code: string): code is PostStatusCode {
  return code in postStatusLabels;
}

type Props = {
  code: string | null | undefined;
  // Shown when the code is unknown (for example the catalog name).
  fallback?: string;
};

export function PostStatusBadge({ code, fallback }: Readonly<Props>) {
  if (!code || !isPostStatusCode(code)) {
    return <Badge variant="outline">{fallback ?? code ?? "—"}</Badge>;
  }

  return (
    <Badge variant="secondary" className={postStatusStyles[code]}>
      {postStatusLabels[code]}
    </Badge>
  );
}
