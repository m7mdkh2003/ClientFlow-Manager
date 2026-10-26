import { useState } from "react";
import { Link, Router, useLocation } from "wouter";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCheck,
  Command,
  LayoutDashboard,
  Menu,
  Users,
  X,
} from "lucide-react";
import type {
  Client,
  Dashboard,
  Project,
  Task,
} from "@workspace/api-client-react";
import {
  ClientsPage,
  DashboardPage,
  ProjectsPage,
  TasksPage,
  EmptyState,
} from "@/components/workspace-pages";
import { ClientDetail, ProjectDetail } from "@/components/workspace-details";
import { dateInDays } from "@/lib/workspace";

const createdAt = `${dateInDays(-30)}T12:00:00.000Z`;
const clients: Client[] = [
  {
    id: 1,
    name: "Maya Chen",
    company: "Maya Studio",
    email: "maya@example.com",
    phone: null,
    notes: "Sample client: a small creative studio preparing a new website.",
    createdAt,
  },
  {
    id: 2,
    name: "Omar Khalil",
    company: "North & Co.",
    email: "omar@example.com",
    phone: null,
    notes: "Sample client: a growing shop refreshing its identity.",
    createdAt,
  },
];
const projects: Project[] = [
  {
    id: 1,
    clientId: 1,
    clientName: "Maya Chen",
    name: "Studio website",
    description:
      "Design and build a clear, accessible website for an independent studio.",
    status: "active",
    deadline: dateInDays(14),
    createdAt,
  },
  {
    id: 2,
    clientId: 2,
    clientName: "Omar Khalil",
    name: "Brand refresh",
    description:
      "Plan a new visual identity and prepare the first set of concepts.",
    status: "planning",
    deadline: dateInDays(21),
    createdAt,
  },
];
const tasks: Task[] = [
  {
    id: 1,
    projectId: 1,
    projectName: "Studio website",
    clientName: "Maya Chen",
    title: "Review the homepage draft",
    description:
      "Collect feedback on the first layout and confirm the content.",
    status: "todo",
    priority: "high",
    dueDate: dateInDays(-1),
    createdAt,
  },
  {
    id: 2,
    projectId: 1,
    projectName: "Studio website",
    clientName: "Maya Chen",
    title: "Build the contact page",
    description: "Add contact information and test the layout on a phone.",
    status: "in_progress",
    priority: "medium",
    dueDate: dateInDays(0),
    createdAt,
  },
  {
    id: 3,
    projectId: 2,
    projectName: "Brand refresh",
    clientName: "Omar Khalil",
    title: "Prepare the moodboard",
    description: "Collect references for the first creative direction.",
    status: "todo",
    priority: "low",
    dueDate: dateInDays(3),
    createdAt,
  },
  {
    id: 4,
    projectId: 1,
    projectName: "Studio website",
    clientName: "Maya Chen",
    title: "Confirm the project brief",
    description: "Agree on scope, deliverables, and deadlines.",
    status: "done",
    priority: "high",
    dueDate: dateInDays(-4),
    createdAt,
  },
];
const dashboard: Dashboard = {
  clientCount: clients.length,
  projectCount: projects.length,
  activeProjectCount: projects.filter((p) => p.status === "active").length,
  taskCounts: { todo: 2, in_progress: 1, done: 1 },
  upcomingTasks: [],
};
const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/projects", label: "Projects", icon: BriefcaseBusiness },
  { href: "/tasks", label: "Tasks", icon: CheckCheck },
];
const noop = () => {};
const signupUrl = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/sign-up`;
function DemoWorkspace() {
  const [location] = useLocation();
  const [searches, setSearches] = useState<Record<string, string>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const search = searches[location] ?? "";
  const setSearch = (value: string) =>
    setSearches((previous) => ({ ...previous, [location]: value }));
  const clientId = location.match(/^\/clients\/(\d+)$/)?.[1];
  const projectId = location.match(/^\/projects\/(\d+)$/)?.[1];
  const shared = {
    loading: false,
    error: false,
    retry: noop,
    readOnly: true,
    openEditor: noop,
    onDelete: noop,
    onMoveTask: noop,
    search,
    setSearch,
  };
  return (
    <div className="app-frame" data-testid="demo-workspace">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup">
          <span className="brand-mark">
            <Command size={19} />
          </span>
          <span>
            clientflow<span className="brand-period">.</span>
          </span>
          <button
            className="mobile-close"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <div className="workspace-label">SAMPLE WORKSPACE</div>
        <nav className="side-nav" aria-label="Demo navigation">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              href={href}
              key={href}
              className={`nav-link ${location === href || (href !== "/" && location.startsWith(`${href}/`)) ? "nav-active" : ""}`}
              onClick={() => setMobileOpen(false)}
              data-testid={`demo-nav-${label.toLowerCase()}`}
            >
              <Icon size={17} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <p>Try the workspace.</p>
            <span>Every record here is sample data.</span>
          </div>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="mobile-scrim"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            <span>ClientFlow</span>
            <span>/</span>
            <strong>Live demo</strong>
          </div>
          <a className="quiet-link" href={signupUrl}>
            Create your workspace <ArrowRight size={14} />
          </a>
        </header>
        <div className="demo-banner" role="note">
          <strong>Read-only demo</strong>
          <span>
            Explore the pages, filters, and exports. These are sample records;
            no account is needed.
          </span>
        </div>
        <div className="content-wrap">
          {location === "/" ? (
            <DashboardPage {...shared} dashboard={dashboard} tasks={tasks} />
          ) : location === "/clients" ? (
            <ClientsPage
              {...shared}
              clients={clients.filter((c) =>
                `${c.name} ${c.company} ${c.email}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )}
            />
          ) : location === "/projects" ? (
            <ProjectsPage
              {...shared}
              projects={projects.filter((p) =>
                `${p.name} ${p.clientName}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )}
            />
          ) : location === "/tasks" ? (
            <TasksPage
              {...shared}
              tasks={tasks.filter((t) =>
                `${t.title} ${t.projectName} ${t.clientName}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )}
              clients={clients}
              projects={projects}
            />
          ) : clientId ? (
            <ClientDetail
              {...shared}
              client={clients.find((c) => c.id === Number(clientId))}
              projects={projects}
            />
          ) : projectId ? (
            <ProjectDetail
              {...shared}
              project={projects.find((p) => p.id === Number(projectId))}
              tasks={tasks}
              clients={clients}
              projects={projects}
            />
          ) : (
            <EmptyState
              title="Page not found"
              text="Choose a page from the demo navigation."
            />
          )}
        </div>
      </main>
    </div>
  );
}
export default function DemoPage() {
  return (
    <Router base="/demo">
      <DemoWorkspace />
    </Router>
  );
}
