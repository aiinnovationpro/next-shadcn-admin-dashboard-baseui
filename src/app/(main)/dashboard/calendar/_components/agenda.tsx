import "./agenda.css";

// /morning writes the agenda as escaped HTML, so it is set as is. This is the only place that does so.
export function Agenda({ html }: { html: string }) {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: escaped fragment written by /morning, see the spec
  return <ul className="morning-agenda" dangerouslySetInnerHTML={{ __html: html }} />;
}
