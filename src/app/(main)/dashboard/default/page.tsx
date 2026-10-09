import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getSnapshot } from "@/lib/workspace/snapshot";

import { WorkspacePage } from "../_workspace/workspace-page";
import { Briefing } from "./_components/briefing";
import { CurrentFocus } from "./_components/current-focus";
import { DayPlan } from "./_components/day-plan";

export default async function Page() {
  const snap = await getSnapshot();
  const { morning } = snap;
  // A missing cache is a plain fact (the briefing collapses); one that exists but cannot be read must say so.
  const cacheBroken = morning.state === "unreadable" || morning.state === "offloaded";
  const hasBriefing = Boolean(morning.lead || morning.briefing || morning.briefingSections || morning.mailStatus);

  return (
    <WorkspacePage snap={snap} title="Today" needs={["STATUS.md"]}>
      {snap.currentFocus && <CurrentFocus text={snap.currentFocus} />}

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

      {snap.dayPlan && <DayPlan lines={snap.dayPlan} />}
    </WorkspacePage>
  );
}
