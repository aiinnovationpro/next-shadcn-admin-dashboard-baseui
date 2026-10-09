import { HowYouWork } from "./_components/how-you-work";
import { ReferenceCards } from "./_components/reference-cards";
import { SetupPhases } from "./_components/setup-phases";

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight">Start here</h1>
        <p className="text-muted-foreground text-sm">
          What this folder is, what the setup does with you, and what you end up with.
        </p>
        <p className="text-muted-foreground text-sm">
          The eight-minute walkthrough, the eleven pictures, is the START-HERE.html page in the workspace root.
        </p>
      </div>

      <HowYouWork />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <SetupPhases />
        </div>
        <div className="xl:col-span-5">
          <ReferenceCards />
        </div>
      </div>
    </div>
  );
}
