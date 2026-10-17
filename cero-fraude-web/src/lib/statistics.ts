// Data loaders for /statistics. The backend has no aggregate endpoints, so
// every number comes from either:
//   - the `total` of a filtered, paginated list (one request per count), or
//   - reading every page of a small list and grouping in the browser.

import { api } from "@/lib/api";
import type { ReportReason, ReportsResponse } from "@/lib/reports";
import type { Role, UsersResponse } from "@/lib/users";
import type { PostStatusCode } from "@/components/post-status-badge";

type CatalogItem = {
  id: number;
  name: string;
  code?: string;
};

type PostSummary = {
  id: number;
  title: string | null;
  is_fraud: boolean | number | null;
};

type PostsResponse = {
  data: PostSummary[];
  page: number;
  total_pages: number;
  total: number;
};

export type NamedCount = {
  id: number;
  name: string;
  count: number;
};

// States shown in the panel (drafts are private to their authors).
export const VISIBLE_STATUSES = [
  "UPLOADED",
  "PUBLISHED",
  "VALIDATED",
  "REJECTED",
] as const satisfies readonly PostStatusCode[];

type VisibleStatus = (typeof VISIBLE_STATUSES)[number];

// Avoids firing dozens of requests at once through the backend proxy.
const MAX_PARALLEL_REQUESTS = 6;

async function mapWithLimit<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(MAX_PARALLEL_REQUESTS, items.length) },
      worker
    )
  );

  return results;
}

// Array filters go as repeated keys (status_id=2&status_id=4), which the
// backend turns into an array. axios would send status_id[]= instead.
function toParams(filters: Record<string, number | number[] | string>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    for (const item of [value].flat()) {
      params.append(key, String(item));
    }
  }

  // Counts only need the first page (its `total` covers every page).
  if (!params.has("page")) params.set("page", "1");

  return params;
}

async function countPosts(
  filters: Record<string, number | number[]>,
  signal: AbortSignal
) {
  const response = await api.get<PostsResponse>("/posts", {
    params: toParams(filters),
    signal,
  });

  return response.data.total;
}

async function getStatusIds(signal: AbortSignal) {
  const response = await api.get<CatalogItem[]>("/states", { signal });
  const ids = {} as Record<VisibleStatus, number>;

  for (const code of VISIBLE_STATUSES) {
    const state = response.data.find((item) => item.code === code);

    if (!state) {
      throw new Error(`No se encontró el estado ${code} en el catálogo.`);
    }

    ids[code] = state.id;
  }

  return ids;
}

// Moderation

export type ModerationStats = {
  byStatus: Record<VisibleStatus, number>;
  total: number;
  fraud: number;
  notFraud: number;
  // Validated posts whose is_fraud is still null (should not happen).
  unclassified: number;
};

export async function loadModerationStats(
  signal: AbortSignal
): Promise<ModerationStats> {
  const statusIds = await getStatusIds(signal);

  const counts = await Promise.all(
    VISIBLE_STATUSES.map((code) =>
      countPosts({ status_id: statusIds[code] }, signal)
    )
  );

  const byStatus = Object.fromEntries(
    VISIBLE_STATUSES.map((code, index) => [code, counts[index]])
  ) as Record<VisibleStatus, number>;

  // There is no is_fraud filter, so fraud vs. not fraud needs every
  // validated post (20 per page).
  const validated = await readAllPages<PostSummary>(
    (page) =>
      api
        .get<PostsResponse>("/posts", {
          params: toParams({ status_id: statusIds.VALIDATED, page }),
          signal,
        })
        .then((response) => response.data)
  );

  const fraud = validated.filter(
    (post) => post.is_fraud === true || post.is_fraud === 1
  ).length;
  const notFraud = validated.filter(
    (post) => post.is_fraud === false || post.is_fraud === 0
  ).length;

  return {
    byStatus,
    total: counts.reduce((sum, count) => sum + count, 0),
    fraud,
    notFraud,
    unclassified: validated.length - fraud - notFraud,
  };
}

async function readAllPages<T>(
  fetchPage: (
    page: number
  ) => Promise<{ data: T[]; total_pages: number }>
) {
  const first = await fetchPage(1);
  const pages = Array.from(
    { length: Math.max(0, first.total_pages - 1) },
    (_, index) => index + 2
  );
  const rest = await mapWithLimit(pages, fetchPage);

  return [first, ...rest].flatMap((result) => result.data);
}

// Content

export type ContentStats = {
  total: number;
  categories: NamedCount[];
  types: NamedCount[];
  // categoryId -> one count per VISIBLE_STATUSES entry.
  matrix: Record<number, number[]>;
};

export async function loadContentStats(
  signal: AbortSignal
): Promise<ContentStats> {
  const [statusIds, categoriesResponse, typesResponse] = await Promise.all([
    getStatusIds(signal),
    api.get<CatalogItem[]>("/categories", { signal }),
    api.get<CatalogItem[]>("/types", { signal }),
  ]);

  const visibleIds = VISIBLE_STATUSES.map((code) => statusIds[code]);
  const categories = categoriesResponse.data;
  const types = typesResponse.data;

  const [total, categoryCounts, typeCounts, cells] = await Promise.all([
    countPosts({ status_id: visibleIds }, signal),
    mapWithLimit(categories, (category) =>
      countPosts({ status_id: visibleIds, category: category.id }, signal)
    ),
    mapWithLimit(types, (type) =>
      countPosts({ status_id: visibleIds, type: type.id }, signal)
    ),
    // 6 categories x 4 states = 24 counts (the filters can be combined).
    mapWithLimit(
      categories.flatMap((category) =>
        visibleIds.map((statusId) => ({ category: category.id, statusId }))
      ),
      ({ category, statusId }) =>
        countPosts({ status_id: statusId, category }, signal)
    ),
  ]);

  const matrix: Record<number, number[]> = {};

  categories.forEach((category, index) => {
    matrix[category.id] = cells.slice(
      index * visibleIds.length,
      (index + 1) * visibleIds.length
    );
  });

  const byCountDesc = (a: NamedCount, b: NamedCount) => b.count - a.count;

  return {
    total,
    categories: categories
      .map((category, index) => ({
        id: category.id,
        name: category.name,
        count: categoryCounts[index],
      }))
      .sort(byCountDesc),
    types: types
      .map((type, index) => ({
        id: type.id,
        name: type.name,
        count: typeCounts[index],
      }))
      .sort(byCountDesc),
    matrix,
  };
}

// Reports

export type ReportedPost = {
  id: number;
  title: string | null;
  count: number;
};

export type ReportStats = {
  total: number;
  reportedPosts: number;
  byReason: NamedCount[];
  topPosts: ReportedPost[];
};

const TOP_REPORTED_POSTS = 5;

export async function loadReportStats(
  signal: AbortSignal
): Promise<ReportStats> {
  const [reasonsResponse, reports] = await Promise.all([
    api.get<ReportReason[]>("/report-reasons", { signal }),
    // GET /reports only accepts `page`, so grouping needs every page.
    readAllPages((page) =>
      api
        .get<ReportsResponse>("/reports", { params: { page }, signal })
        .then((response) => response.data)
    ),
  ]);

  const byReason = reasonsResponse.data
    .map((reason) => ({
      id: reason.id,
      name: reason.name,
      count: reports.filter((report) => report.report_reason === reason.id)
        .length,
    }))
    .sort((a, b) => b.count - a.count);

  const perPost = new Map<number, number>();

  for (const report of reports) {
    perPost.set(report.post, (perPost.get(report.post) ?? 0) + 1);
  }

  const top = [...perPost.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, TOP_REPORTED_POSTS);

  // Titles come from the post detail (the report only has the post ID).
  const titles = await mapWithLimit(top, ([postId]) =>
    api
      .get<PostSummary>(`/posts/${postId}`, { signal })
      .then((response) => response.data.title)
      .catch(() => null)
  );

  return {
    total: reports.length,
    reportedPosts: perPost.size,
    byReason,
    topPosts: top.map(([id, count], index) => ({
      id,
      count,
      title: titles[index],
    })),
  };
}

// Users

export type MonthCount = {
  label: string;
  count: number;
};

export type UserStats = {
  total: number;
  admins: number;
  active: number;
  registrationsByMonth: MonthCount[];
};

const REGISTRATION_MONTHS = 6;

async function countUsers(
  filters: Record<string, string | number | boolean>,
  signal: AbortSignal
) {
  const response = await api.get<UsersResponse>("/users", {
    params: { page: 1, ...filters },
    signal,
  });

  return response.data.total;
}

export async function loadUserStats(signal: AbortSignal): Promise<UserStats> {
  const rolesResponse = await api.get<Role[]>("/roles", { signal });
  const adminRoleId = rolesResponse.data.find(
    (role) => role.code === "ADMIN"
  )?.id;

  if (adminRoleId === undefined) {
    throw new Error("No se encontró el rol de administrador.");
  }

  // Calendar months in local time, oldest first, ending with this month.
  const now = new Date();
  const months = Array.from({ length: REGISTRATION_MONTHS }, (_, index) => {
    const offset = REGISTRATION_MONTHS - 1 - index;
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

    return {
      label: new Intl.DateTimeFormat("es-MX", { month: "short" })
        .format(start)
        .replace(".", ""),
      initial_date: start.toISOString(),
      // final_date is inclusive (created_at <= final_date).
      final_date: new Date(end.getTime() - 1).toISOString(),
    };
  });

  const [total, admins, active, monthCounts] = await Promise.all([
    countUsers({}, signal),
    countUsers({ role_id: adminRoleId }, signal),
    countUsers({ is_active: true }, signal),
    mapWithLimit(months, (month) =>
      countUsers(
        {
          initial_date: month.initial_date,
          final_date: month.final_date,
        },
        signal
      )
    ),
  ]);

  return {
    total,
    admins,
    active,
    registrationsByMonth: months.map((month, index) => ({
      label: month.label,
      count: monthCounts[index],
    })),
  };
}
