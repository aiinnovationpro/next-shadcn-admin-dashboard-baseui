import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { phases, setupIntro } from "../_data/start-here";
import { ItemList } from "./item-list";

export function SetupPhases() {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="setup-heading">
      <div className="flex flex-col gap-1">
        <h2 id="setup-heading" className="font-medium text-lg">
          What the setup puts in place
        </h2>
        <p className="text-muted-foreground text-sm">{setupIntro}</p>
      </div>
      {phases.map((phase, i) => (
        <Card key={phase.title} size="sm">
          <CardHeader>
            <CardTitle>
              {i + 1}. {phase.title}
            </CardTitle>
            <CardDescription>{phase.meta}</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion multiple>
              {phase.steps.map((step) => (
                <AccordionItem key={step.title} value={step.title}>
                  <AccordionTrigger>
                    <span className="flex flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-2">
                        {step.title}
                        {step.tag && <Badge variant="secondary">{step.tag}</Badge>}
                      </span>
                      <span className="font-normal text-muted-foreground">{step.summary}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {step.detail.map((d) => (
                      <p key={d}>{d}</p>
                    ))}
                    {step.items && (
                      <div className="mt-4 rounded-lg bg-muted/40 p-3 text-foreground">
                        <ItemList items={step.items} />
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
