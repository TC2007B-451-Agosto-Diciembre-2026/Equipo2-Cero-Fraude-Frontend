type PageHeaderProps = {
  title: React.ReactNode;
  description?: React.ReactNode;
  // Actions shown on the right (for example the "Actualizar" button).
  children?: React.ReactNode;
};

export function PageHeader({
  title,
  description,
  children,
}: Readonly<PageHeaderProps>) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>

        {description && (
          <div className="mt-1 text-sm text-muted-foreground">
            {description}
          </div>
        )}
      </div>

      {children && (
        <div className="flex flex-wrap items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
