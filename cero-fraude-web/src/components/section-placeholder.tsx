
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {title}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {description}
        </p>
      </div>

      <Card>
        <CardContent className="flex min-h-64 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Sección pendiente de implementación.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
