import { FolderKanban, Inbox, ListTodo, type LucideIcon } from "lucide-react";

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

// Phase 1 views. Today, Calendar, Workspace and Start Here arrive in phase 2.
export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    items: [
      { id: "tasks", title: "Tasks", url: "/dashboard/tasks", icon: ListTodo },
      { id: "inbox", title: "Inbox", url: "/dashboard/inbox", icon: Inbox },
      { id: "projects", title: "Projects", url: "/dashboard/projects", icon: FolderKanban },
    ],
  },
];
