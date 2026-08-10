import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border bg-card/60 px-6 py-12 text-center space-y-2",
        className,
      )}
    >
      <p className="text-sm font-bold text-foreground">{title}</p>
      {description ? (
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">{description}</p>
      ) : null}
      {action ? <div className="pt-3 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm space-y-2",
        className,
      )}
    >
      <p className="font-semibold text-foreground">{title}</p>
      {description ? <p className="text-muted-foreground">{description}</p> : null}
      {onRetry ? (
        <Button size="sm" variant="outline" type="button" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
