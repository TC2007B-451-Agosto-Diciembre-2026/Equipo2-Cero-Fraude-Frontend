// Shapes returned by the backend reports endpoints. Shared by the post detail
// card and the /reports page, so they live here instead of in each file.

export type Report = {
  id: number;
  information: string | null;
  report_reason: number;
  user: string;
  post: number;
};

export type ReportsResponse = {
  data: Report[];
  page: number;
  total_pages: number;
  total: number;
};

export type ReportReason = {
  id: number;
  name: string;
  code: string;
};

export function getReportReasonName(
  reasons: ReportReason[],
  reasonId: number
) {
  return (
    reasons.find((reason) => reason.id === reasonId)?.name ??
    `Motivo #${reasonId}`
  );
}
