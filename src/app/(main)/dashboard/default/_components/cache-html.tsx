import { cn } from "cn";

// The one place cache HTML is rendered. /morning writes these fragments with their text already escaped, and the
// markup is its own, so they go in as written. Styling for the classes they use is scoped to this wrapper
// (nothing global), and uses theme tokens so light and dark both work.
export function CacheHtml({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 [&_.brf-sec>div]:mt-2 [&_.brf-sec>div]:flex [&_.brf-sec>div]:flex-col [&_.brf-sec>div]:gap-2 [&_.brf-sec>div]:text-muted-foreground [&_.brf-sec>summary]:cursor-pointer [&_.brf-sec]:rounded-md [&_.brf-sec]:border [&_.brf-sec]:px-3 [&_.brf-sec]:py-2 [&_.bs-count]:ml-2 [&_.bs-count]:rounded-full [&_.bs-count]:bg-muted [&_.bs-count]:px-2 [&_.bs-count]:py-0.5 [&_.bs-count]:text-muted-foreground [&_.bs-count]:text-xs [&_.bs-count]:tabular-nums [&_.bs-title]:font-medium [&_b]:font-semibold [&_b]:text-foreground [&_p]:leading-relaxed [&_strong]:font-semibold",
        className,
      )}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: escaped fragments written by /morning, see above
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
