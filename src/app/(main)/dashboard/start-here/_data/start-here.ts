// Static orientation copy, carried over from the old dashboard's Start Here tab. Not read from the workspace.

export interface Item {
  name: string;
  tag?: string;
  text: string;
}

export interface Step {
  title: string;
  tag?: string;
  summary: string;
  detail: string[];
  items?: Item[];
}

export interface Phase {
  title: string;
  meta: string;
  steps: Step[];
}

export const howYouWork: { lead: string; text: string }[] = [
  {
    lead: "In the morning",
    text: 'say "good morning". Claude fetches calendar and mails, briefs you and builds this dashboard. Optionally you plan the day through afterwards.',
  },
  {
    lead: "During the day",
    text: 'just talk, no command needed: "chapter 3 is done", "waiting on IT", "meeting went well, we are doing X". Claude files it away.',
  },
  {
    lead: "Documents",
    text: 'go into the inbox/ folder, then say "read this in". Decisions and to-dos land in the right project.',
  },
  {
    lead: "In the evening",
    text: 'say "end of day": a short wrap-up, what happened and what is left over. What is coming up in the next few days you simply ask in the chat ("what is on this week?").',
  },
  {
    lead: "If something is wrong",
    text: 'just say so: "that is not right", "I answered that long ago". It gets corrected, no discussion. If the same mistake comes up repeatedly, the cause gets fixed.',
  },
  {
    lead: "In a hurry?",
    text: '"Good morning, quick" skips the inbox analysis: calendar and tasks in about 30 seconds. Been away longer? Just say "good morning", you will be asked what piled up.',
  },
  {
    lead: "No commands to remember.",
    text: '"What is on today?" does the same as "good morning", and one fresh conversation per day is plenty.',
  },
];

export const setupIntro =
  "The whole run, in the order it happens. Once, twenty to thirty minutes, and you can stop after any one of the four phases. Open any step to read why it is there.";

export const plugins: Item[] = [
  {
    name: "skill-creator",
    text: "You describe something you do every week; it builds you your own command for it. This is the one that turns the folder from a fixed set of features into something that grows with you.",
  },
  {
    name: "ponytail",
    text: 'Keeps whatever gets built small. Without it an AI answers "add a cache" with a cache class; with it, with one line. Matters most for people who do not read code and cannot tell the difference.',
  },
  {
    name: "claude-code-setup",
    text: "Reads how you have actually been working after a few weeks and says which of your repeated steps is worth turning into a command. Useless on day one, valuable in month two.",
  },
  {
    name: "code-review",
    text: "Reviews your own changes before they go out: several viewpoints first, then a separate pass that throws out everything it cannot actually prove. Pairs with /security-review, which Claude Code brings itself.",
  },
  {
    name: "claude-md-management",
    text: 'Your rules file grows every time you say "from now on". After months it sprawls and starts contradicting itself. This tidies it.',
  },
  {
    name: "impeccable",
    text: "Design guidance for anything with a screen: layout, spacing, colour, accessibility. Only pays off if you actually build interfaces.",
  },
  {
    name: "superpowers",
    text: "Development method: test first, debug systematically, plan before writing. For the people on your team who write code.",
  },
  {
    name: "claude-mem",
    text: "Remembers across sessions, so a new chat does not start from nothing. The one that gets asked about first: it keeps running in the background and writes down what it reads, including client documents. Yes or no, both are fine, everything works without it.",
  },
];

// "Eight", not 8, in running text. Derived from the list so the copy cannot drift from it.
const NUMBER_WORDS = [
  "No",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
];
export const pluginCount = NUMBER_WORDS[plugins.length] ?? String(plugins.length);

export const phases: Phase[] = [
  {
    title: "You answer a few questions",
    meta: "about five minutes",
    steps: [
      {
        title: "Which language you want",
        summary: "Everything the system says to you afterwards follows it.",
        detail: [
          "Briefing, dashboard, the entries in your files, mail drafts. The package's own files stay English; that is a different thing and does not concern you.",
        ],
      },
      {
        title: "Fresh start, or a folder you already have",
        summary: "Decides which of two different jobs this is.",
        detail: [
          "If you already have a folder with your work in it, nothing new gets built next to it, that one gets taken over. Skipping this question is how people end up with two half systems and neither one complete.",
        ],
      },
      {
        title: "Six questions about you",
        summary: "Name, work, location, projects, the tools you use daily, your plan.",
        detail: [
          "The tools question is the one that pays off later: your systems get connected by name further down, instead of being asked about abstractly fifteen minutes after you already said it. And the plan question decides how generously the system works, because you know your plan, it is on your invoice.",
        ],
      },
    ],
  },
  {
    title: "It sets itself up",
    meta: "nothing asked, it just runs",
    steps: [
      {
        title: "It writes itself up from your answers",
        summary: "Your settings, your model, a quiet look at your machine.",
        detail: [
          "Three things at once, and none of them needs you. Everything you said lands in one config file that every command reads from afterwards. The model gets worked out from your plan rather than asked about: on the twenty-euro plan always the fast one, because the expensive one burns through that quota in an hour or two. And it checks quietly what this machine can do, which connections already answer and whether the dashboard can be built here at all, so nobody has to ask you twice.",
        ],
      },
      {
        title: "Your projects become folders",
        summary: "One per project, each with what it is and where it stands.",
        detail: [
          "That page is the difference between a folder of files and something that can answer where everything stands on a Monday.",
        ],
      },
      {
        title: "Whatever documents you brought",
        tag: "if you have any",
        summary: "Filed into the right project, not onto a heap.",
        detail: [
          "And what is inside them gets pulled out on the way: decisions, open points with an owner, the people involved.",
        ],
      },
    ],
  },
  {
    title: "It connects your world",
    meta: "the part that otherwise never happens",
    steps: [
      {
        title: "Your writing style, read once",
        tag: "asked first",
        summary: "So drafts sound like you, not like a template.",
        detail: [
          "Your own sent mail is read once, read only, nothing is ever sent, and you say yes before it happens. Without this step every draft still works, it just sounds generic.",
        ],
      },
      {
        title: "The tools, the plugins, two accounts",
        summary: `playwright and firecrawl, ${pluginCount.toLowerCase()} plugins, and the keys they need.`,
        detail: [
          "Three things in one step, because they only work together: a tool without its key does nothing, and a key without its tool has nothing to unlock.",
          "Where the keys live: in a file outside this folder, with permissions only you can read. That way a repo that gets cloned, backed up or shared never carries them.",
        ],
        items: [
          {
            name: "playwright",
            text: 'A real browser Claude can drive. Log into a portal, fill a form, check whether a page actually looks right after a change. This is what turns "I cannot see that" into "I looked".',
          },
          {
            name: "firecrawl",
            tag: "needs a key",
            text: "Reads web pages and searches, without opening a window. A competitor's site, a supplier's price list, what changed in a regulation. Your own free account, so nobody shares a limit with you.",
          },
          {
            name: `${pluginCount} plugins`,
            text: "The curated set, listed one by one below. New ones appear almost daily and telling this week's real thing from the noise is a job of its own, so handing you a list to install yourself would give you back exactly the work you were meant to be spared.",
          },
          {
            name: "OpenRouter",
            tag: "a key",
            text: "Images, and models that do not come from Anthropic. Only matters if you generate visuals or want a second opinion from a different model.",
          },
        ],
      },
      {
        title: "Your systems, connected by name",
        summary: "Mailbox, calendar, and whatever else you named.",
        detail: [
          "Mail, calendar and files are reached through direct Google API calls, with the sign-in held in Doppler. The Google connectors in claude.ai are deliberately not used. Mail is read and drafted, the calendar is only read, and the two promises hold everywhere: nothing is ever sent and nothing is ever written into your calendar.",
          'Not in the catalogue? Then that system\'s own connector gets added directly instead. You fetch a token, Claude runs the command. It only ends at "no way in" once that has actually been checked.',
        ],
        items: [
          {
            name: "Your mailbox",
            tag: "not optional",
            text: "Gmail, through the Google API. Drafts are saved as drafts, never sent. Without it the morning briefing cannot tell what needs an answer from what is just noise, and no draft can be written at all.",
          },
          {
            name: "Your calendar",
            tag: "not optional",
            text: "Appointments in the briefing and the day timeline, including the gaps between them. Reminders are shown apart from real meetings, so a to-do does not masquerade as an appointment.",
          },
          {
            name: "Where your customers live",
            text: 'HubSpot, Salesforce, Pipedrive. Then "where do we stand with them" is answered before a call instead of during it, and a draft carries the real history rather than your memory of it.',
          },
          {
            name: "Where the work is tracked",
            text: "Linear, Jira, Asana, ClickUp, Notion. Read as context, deliberately never as a second task list: your own open points stay in one place, otherwise you have two lists and neither one is right.",
          },
          {
            name: "Where your files are",
            text: "Google Drive, through the same Google API sign-in. A document gets filed straight from where it already lives, instead of being downloaded first and forgotten in a folder afterwards.",
          },
          {
            name: "Where the talking happens",
            text: "Teams or Slack. What gets agreed in a thread at four in the afternoon otherwise never reaches any project.",
          },
          {
            name: "Where your code is",
            tag: "only if you have it",
            text: "GitHub, Supabase, Vercel. Only comes up if you build software; skipped without comment if you do not.",
          },
        ],
      },
      {
        title: "Git: your code in, your state out",
        summary: "Your projects attached, your own private backup created.",
        detail: [
          "Two directions. A project with its own repository gets cloned into that project keeping its full history, nothing copied, nothing merged. And a private repo gets created for you under your own account, visible to nobody else, where the end of the day pushes your state so a lost laptop is not a lost year.",
        ],
      },
    ],
  },
  {
    title: "You watch it work",
    meta: "one minute, then you are done",
    steps: [
      {
        title: "The first dashboard, built while someone is watching",
        summary: "Built from your fresh data and opened.",
        detail: [
          "Two things at once: you see a result immediately, and the fact that it renders is proven on your machine while there is still someone next to you if it does not.",
        ],
      },
    ],
  },
];

export const commands = ["/morning", "/eod", "/ingest", "/email", "/checkup", "/audit", "/adopt", "/setup"];

export const alreadyHere: Item[] = [
  {
    name: "Specialist skills",
    text: "Word, PDF, slides, web research, browser control, databases, building your own commands, turning documents into audio. Not called by name, they kick in when a task needs them.",
  },
  {
    name: "Two review commands",
    text: "/review and /security-review are part of Claude Code itself, nothing to install. The fuller /code-review comes from the plugin set above.",
  },
];

export const alsoYours: Item[] = [
  {
    name: "headroom",
    text: "A connection, not a plugin: it compresses tool output, logs and search results before they reach the model. Sixty to ninety-five percent fewer tokens on JSON data, fifteen to twenty on ordinary coding work, so the big number applies exactly where a lot of volume comes back from connected systems. It sits in the data path, so install it deliberately: first measure with npx codeburn whether your usage really hangs on tool output.",
  },
  {
    name: "Two more plugins",
    text: "Not part of the run because they install differently: codeburn needs no installation at all (npx codeburn shows what your usage costs), and find-skills comes through the open skill registry.",
  },
  {
    name: "More connections",
    text: "Notion, Linear, Jira, Asana, Stripe, GitHub, Supabase, Vercel. Which one is worth what, and where the limits are, is written down in reference/mcp.md. Say the name and it gets connected.",
  },
  {
    name: "Systems not in the catalogue",
    text: "Not the end of it: their own MCP server gets added directly in Claude Code. You fetch a token, Claude runs the command. /checkup is the route for all of this after the setup has archived itself.",
  },
];
