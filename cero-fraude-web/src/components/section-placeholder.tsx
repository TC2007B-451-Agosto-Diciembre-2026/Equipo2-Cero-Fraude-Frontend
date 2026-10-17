import { Inbox } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

type SectionPlaceholderProps = {
  title: string;
  description: string;
};

export function SectionPlaceholder({
  title,
  description,
}: Readonly<SectionPlaceholderProps>) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />

      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
          <Inbox className="size-6" aria-hidden="true" />
          <p className="text-sm">Sección pendiente de implementación.</p>
        </CardContent>
      </Card>
    </div>
  );
}
