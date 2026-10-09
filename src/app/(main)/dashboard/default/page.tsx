import { AlertTriangle, Mail } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSnapshot } from "@/lib/workspace/snapshot";

import { UnreadableSource, WorkspacePage } from "../_workspace/workspace-page";
import { Briefing } from "./_components/briefing";
import { CurrentFocus } from "./_components/current-focus";
import { DayPlan } from "./_components/day-plan";

export default async function Page() {
  const snap = await getSnapshot();
  const { morning } = snap;
  // A missing cache is a plain fact (the briefing collapses); one that exists but cannot be read must say so.
  const cacheBroken = morning.state === "unreadable" || morning.state === "offloaded";
  const hasBriefing = Boolean(morning.lead || morning.briefing || morning.briefingSections || morning.mailStatus);
  const mailUnchecked = morning.state === "ok" && !morning.mailChecked;
  // The briefing comes from the mail cache, so it does not depend on STATUS.md; Current Focus and Day Plan do.
  const status = snap.sources.find((s) => s.name === "STATUS.md");
  const statusBroken = status !== undefined && status.state !== "ok";

  return (
    <WorkspacePage snap={snap} title="Today" needs={[]}>
      {statusBroken && <UnreadableSource source={status} />}
      {!statusBroken && snap.currentFocus && <CurrentFocus text={snap.currentFocus} />}

      {cacheBroken && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>The morning briefing cannot be shown</AlertTitle>
          <AlertDescription>
            The mail state file exists but cannot be read. The briefing is not missing, it is unreadable.
          </AlertDescription>
        </Alert>
      )}
      {hasBriefing && <Briefing morning={morning} />}
      {mailUnchecked && (
        <p className="flex items-center gap-2 text-muted-foreground text-sm">
          <Mail className="size-4 shrink-0" aria-hidden />
          Mail was not checked in the last morning run.
        </p>
      )}

      {!statusBroken && snap.dayPlan && <DayPlan lines={snap.dayPlan} />}
    </WorkspacePage>
  );
}
