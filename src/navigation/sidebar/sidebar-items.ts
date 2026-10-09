import { CalendarDays, Compass, FolderKanban, Inbox, ListTodo, type LucideIcon, Sun, Wrench } from "lucide-react";

export type NavBadge = "new" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

// The six views.
export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    items: [
      { id: "today", title: "Today", url: "/dashboard/default", icon: Sun },
      { id: "calendar", title: "Calendar", url: "/dashboard/calendar", icon: CalendarDays },
      { id: "tasks", title: "Tasks", url: "/dashboard/tasks", icon: ListTodo },
      { id: "inbox", title: "Inbox", url: "/dashboard/inbox", icon: Inbox },
      { id: "projects", title: "Projects", url: "/dashboard/projects", icon: FolderKanban },
      { id: "workspace", title: "Workspace", url: "/dashboard/workspace", icon: Wrench },
      { id: "start-here", title: "Start Here", url: "/dashboard/start-here", icon: Compass },
    ],
  },
];
