import "./agenda.css";

// /morning writes the agenda as escaped HTML, so it is set as is. This and timeline.tsx are the only places that do.
// The plain list: an old agenda behind its "from [day]" label. Today's agenda is drawn by <Timeline>.
export function Agenda({ html }: { html: string }) {
  return (
    <div className="morning-agenda">
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: escaped fragment written by /morning, see the spec */}
      <ul dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
