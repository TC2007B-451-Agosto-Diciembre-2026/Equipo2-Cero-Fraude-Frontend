import { Badge } from "@/components/ui/badge";

type Props = {
  active: boolean;
  // "Activa" / "Inactiva" when the badge refers to the account.
  feminine?: boolean;
};

export function UserStatusBadge({ active, feminine = false }: Readonly<Props>) {
  const label = active
    ? feminine ? "Activa" : "Activo"
    : feminine ? "Inactiva" : "Inactivo";

  return (
    <Badge
      variant="secondary"
      className={
        active
          ? "bg-emerald-100 text-emerald-800"
          : "bg-slate-100 text-slate-800"
      }
    >
      {label}
    </Badge>
  );
}
