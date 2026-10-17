// Shapes returned by the backend users and roles endpoints. Shared by the
// administration page and the user detail, so they live here.

export type User = {
  id: string;
  username: string;
  email: string;
  // MySQL returns 1/0 for this column.
  is_active: boolean | number;
  role_id: number;
  created_at?: string;
};

export type UsersResponse = {
  data: User[];
  page: number;
  total_pages: number;
  total: number;
};

export type Role = {
  id: number;
  name: string;
  code: string;
};

export type RoleCode = "ADMIN" | "USER";

// Role IDs are resolved by `code` (the api.md example has them swapped).
export function getRoleIdByCode(roles: Role[], code: RoleCode) {
  return roles.find((role) => role.code === code)?.id ?? null;
}

export function getRoleName(roles: Role[], roleId: number) {
  return (
    roles.find((role) => role.id === roleId)?.name ?? `Rol ${roleId}`
  );
}

export function formatUserDate(value: string | undefined) {
  if (!value) return "No disponible";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "No disponible";

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
  }).format(date);
}
