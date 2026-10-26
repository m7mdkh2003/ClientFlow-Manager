import { afterAll, beforeAll, expect, it, vi } from "vitest";
import request from "supertest";
import { JSDOM } from "jsdom";
import { pool } from "@workspace/db";
import React, { act } from "react";
import type { Root } from "react-dom/client";
vi.mock("@clerk/express", async () => {
  const { testIdentity } = await import("./clerk");
  return {
    getAuth: () => ({ userId: testIdentity.userId }),
    clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) =>
      next(),
  };
});
import app from "../artifacts/api-server/src/app";
let dom: JSDOM;
let root: Root;
let AppComponent: React.ComponentType;
let apiCalls: Array<{ method: string; path: string; status: number }> = [];
const byId = (id: string) =>
  document.querySelector(`[data-testid="${id}"]`) as HTMLElement;
async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 65));
  });
}
async function waitFor(predicate: () => unknown) {
  for (let i = 0; i < 160; i++) {
    await settle();
    if (predicate()) return;
  }
  throw new Error(
    "Timed out waiting for UI: " +
      document.body.innerHTML?.slice(-2000) +
      " URL:" +
      location.href +
      " calls:" +
      JSON.stringify(apiCalls),
  );
}
async function click(id: string) {
  const el = byId(id);
  expect(el, "Missing " + id).toBeTruthy();
  await act(async () => el.click());
  await settle();
}
async function fill(id: string, value: string) {
  const el = byId(id) as HTMLInputElement;
  expect(el, "Missing " + id).toBeTruthy();
  await act(async () => {
    const proto =
      el.tagName === "SELECT"
        ? dom.window.HTMLSelectElement.prototype
        : el.tagName === "TEXTAREA"
          ? dom.window.HTMLTextAreaElement.prototype
          : dom.window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
    el.dispatchEvent(
      new dom.window.Event(el.tagName === "SELECT" ? "change" : "input", {
        bubbles: true,
      }),
    );
    el.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  });
}
async function submit(kind: string) {
  await act(async () => {
    byId("form-" + kind).dispatchEvent(
      new dom.window.Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  await waitFor(() => !byId("form-" + kind));
}
beforeAll(async () => {
  dom = new JSDOM(
    '<!doctype html><html><body><div id="root"></div></body></html>',
    { url: "http://clientflow.test/" },
  );
  for (const name of [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLSelectElement",
    "HTMLTextAreaElement",
    "Event",
    "MouseEvent",
    "KeyboardEvent",
    "MutationObserver",
    "Node",
    "NodeFilter",
    "DocumentFragment",
    "CustomEvent",
    "getComputedStyle",
    "location",
    "history",
    "localStorage",
    "sessionStorage",
  ])
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value: (dom.window as any)[name],
    });
  (globalThis as any).addEventListener = dom.window.addEventListener.bind(
    dom.window,
  );
  (globalThis as any).removeEventListener = dom.window.removeEventListener.bind(
    dom.window,
  );
  (globalThis as any).dispatchEvent = dom.window.dispatchEvent.bind(dom.window);
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.confirm = () => true;
  globalThis.fetch = async (input: any, options: any = {}) => {
    const method = (options.method ?? "GET").toLowerCase();
    const path = typeof input === "string" ? input : input.url;
    let req = (request(app) as any)
      [method](path)
      .set({ Host: "clientflow.test", Origin: "http://clientflow.test" });
    if (options.body) req = req.send(JSON.parse(options.body));
    const result = await req;
    apiCalls.push({ method, path, status: result.status });
    return new Response(
      [204, 205, 304].includes(result.status)
        ? null
        : JSON.stringify(result.body),
      {
        status: result.status,
        headers: { "content-type": "application/json" },
      },
    );
  };
  const { createRoot } = await import("react-dom/client");
  const { default: App } = await import("../artifacts/clientflow/src/App");
  AppComponent = App;
  root = createRoot(document.getElementById("root")!);
  await act(async () => root.render(<App />));
  await waitFor(() => byId("metric-clients"));
});
afterAll(async () => {
  await act(async () => root?.unmount());
  await pool.end();
  dom?.window.close();
});
it("renders the initial empty workspace and reveals missing prerequisites", async () => {
  expect(byId("metric-clients").textContent).toContain("00");
  expect(byId("onboarding")).toBeTruthy();
  await click("link-nav-tasks");
  await click("button-create-task");
  expect((byId("button-submit-task") as HTMLButtonElement).disabled).toBe(true);
  expect(
    (byId("select-task-projectId") as HTMLSelectElement).textContent,
  ).toContain("Add a project first");
  await click("button-close-editor");
});
it("creates a client, linked project, and task through the real frontend and API routes", async () => {
  await click("link-nav-clients");
  await waitFor(() => byId("button-empty-create-client"));
  await click("button-create-client");
  await fill("input-client-name", "Customer Alpha");
  await fill("input-client-email", "alpha@example.com");
  await submit("client");
  await waitFor(() => byId("card-client-1"));
  expect(byId("text-client-name-1").textContent).toBe("Customer Alpha");
  await click("link-nav-projects");
  await click("button-create-project");
  await fill("input-project-name", "Website launch");
  await fill("select-project-clientId", "1");
  await fill("select-project-status", "active");
  await submit("project");
  await waitFor(() => byId("row-project-1"));
  await click("link-nav-tasks");
  await click("button-create-task");
  await fill("input-task-title", "Build homepage");
  await fill("select-task-projectId", "1");
  await fill("input-task-dueDate", "2026-12-01");
  await submit("task");
  await waitFor(() => byId("card-task-1"));
  expect(byId("column-tasks-todo").textContent).toContain("Build homepage");
});
it("moves a task to in-progress and done", async () => {
  await click("button-move-task-1");
  await waitFor(() =>
    byId("column-tasks-in_progress").textContent?.includes("Build homepage"),
  );
  await click("button-move-task-1");
  await waitFor(() =>
    byId("column-tasks-done").textContent?.includes("Build homepage"),
  );
});
it("reports the actual reason why a linked client cannot be deleted", async () => {
  await click("link-nav-clients");
  await waitFor(() => byId("card-client-1"));
  await click("button-delete-client-1");
  await waitFor(() =>
    apiCalls.some((c) => c.method === "delete" && c.status === 409),
  );
  await waitFor(() => byId("status-feedback"));
  expect(byId("status-feedback").textContent).toMatch(/project|linked/i);
});
it("keeps client search separate from project search", async () => {
  await fill("input-search", "alpha@example.com");
  await settle();
  await click("link-nav-projects");
  await settle();
  expect(
    byId("row-project-1"),
    "The existing project should remain discoverable after leaving client email search",
  ).not.toBeNull();
});
it("closes the editor when Escape is pressed", async () => {
  await click("button-create-project");
  await act(async () =>
    document.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    ),
  );
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it("opens client and project details and preselects the parent for new records", async () => {
  await click("link-nav-clients");
  await fill("input-search", "");
  await settle();
  await click("link-client-1");
  expect(byId("detail-client-1")).toBeTruthy();
  expect(byId("row-project-1")).toBeTruthy();
  await click("button-create-project");
  expect((byId("select-project-clientId") as HTMLSelectElement).value).toBe(
    "1",
  );
  await fill("input-project-name", "Second project");
  await submit("project");
  await waitFor(() => byId("row-project-2"));
  await click("link-project-1");
  expect(byId("detail-project-1")).toBeTruthy();
  expect(byId("project-progress").textContent).toContain("100%");
  await click("button-create-task");
  expect((byId("select-task-projectId") as HTMLSelectElement).value).toBe("1");
  await fill("input-task-title", "Review payment");
  await fill("select-task-priority", "high");
  await fill("input-task-dueDate", "2026-12-02");
  await submit("task");
  await waitFor(() => byId("card-task-2"));
  expect(byId("project-progress").textContent).toContain("50%");
});
it("filters tasks, explains an empty result, and restores all records on reset", async () => {
  await click("link-nav-tasks");
  await fill("filter-priority", "high");
  await settle();
  expect(byId("card-task-2")).toBeTruthy();
  expect(byId("card-task-1")).toBeNull();
  await fill("filter-project", "2");
  await settle();
  expect(byId("status-empty").textContent).toContain("No matching tasks");
  await click("button-reset-filters");
  expect(byId("card-task-1")).toBeTruthy();
  expect(byId("card-task-2")).toBeTruthy();
});
it("exports only the currently filtered tasks", async () => {
  let captured: Blob | undefined;
  const create = vi
    .spyOn(URL, "createObjectURL")
    .mockImplementation((blob: any) => {
      captured = blob;
      return "blob:review";
    });
  const anchor = vi
    .spyOn(dom.window.HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});
  await fill("filter-priority", "high");
  await settle();
  await click("button-export-tasks");
  const csv = await captured!.text();
  expect(csv).toContain("Review payment");
  expect(csv).not.toContain("Build homepage");
  create.mockRestore();
  anchor.mockRestore();
  await click("button-reset-filters");
});
it("blocks a whitespace-only name in the form before contacting the API", async () => {
  await click("link-nav-clients");
  await fill("input-search", "");
  await click("button-create-client");
  await fill("input-client-name", "   ");
  const before = apiCalls.length;
  await act(async () =>
    byId("form-client").dispatchEvent(
      new dom.window.Event("submit", { bubbles: true, cancelable: true }),
    ),
  );
  await settle();
  expect(document.querySelector(".field-error")?.textContent).toContain(
    "Client name is required",
  );
  expect(apiCalls.length).toBe(before);
  await click("button-cancel-editor");
});
it("preserves unsaved input when discarding is declined and returns keyboard focus on close", async () => {
  const trigger = byId("button-create-client");
  trigger.focus();
  await click("button-create-client");
  await fill("input-client-name", "Unsaved client");
  dom.window.confirm = vi.fn(() => false);
  await act(async () =>
    document.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    ),
  );
  await settle();
  expect((byId("input-client-name") as HTMLInputElement).value).toBe(
    "Unsaved client",
  );
  dom.window.confirm = () => true;
  await act(async () =>
    document.dispatchEvent(
      new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    ),
  );
  await settle();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});
it("retains entered data on a network failure and allows retry", async () => {
  await click("button-create-client");
  await fill("input-client-name", "Retry customer");
  const original = globalThis.fetch;
  globalThis.fetch = async (input: any, options: any = {}) => {
    if (options.method === "POST") throw new TypeError("Network offline");
    return original(input, options);
  };
  await act(async () =>
    byId("form-client").dispatchEvent(
      new dom.window.Event("submit", { bubbles: true, cancelable: true }),
    ),
  );
  await waitFor(() =>
    byId("status-feedback")?.textContent?.includes("Could not add"),
  );
  expect((byId("input-client-name") as HTMLInputElement).value).toBe(
    "Retry customer",
  );
  globalThis.fetch = original;
  await submit("client");
  await waitFor(() => byId("card-client-2"));
});
it("shows overdue tasks separately from upcoming deadlines", async () => {
  const { dateInDays } =
    await import("../artifacts/clientflow/src/lib/workspace");
  await click("link-nav-tasks");
  await click("button-edit-task-2");
  await fill("input-task-dueDate", dateInDays(-1));
  await submit("task");
  await click("link-nav-overview");
  await waitFor(() => byId("count-overdue")?.textContent === "1");
  expect(document.querySelector(".attention-panel")?.textContent).toContain(
    "Review payment",
  );
  expect(document.querySelector(".upcoming-panel")?.textContent).not.toContain(
    "Review payment",
  );
});
it("offers a public read-only demo with working navigation and no workspace API requests", async () => {
  await settle();
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  await act(async () => history.pushState({}, "", "/demo"));
  await waitFor(() => byId("demo-workspace"));
  expect(byId("button-create-client")).toBeNull();
  expect(byId("button-create-task")).toBeNull();
  await click("demo-nav-projects");
  await click("link-project-1");
  expect(location.pathname).toBe("/demo/projects/1");
  expect(byId("detail-project-1")).toBeTruthy();
  expect(byId("button-create-task")).toBeNull();
  await click("demo-nav-tasks");
  await fill("filter-priority", "high");
  await settle();
  expect(byId("card-task-1")).toBeTruthy();
  expect(byId("card-task-2")).toBeNull();
  expect(fetchSpy).not.toHaveBeenCalled();
  fetchSpy.mockRestore();
  await act(async () => history.pushState({}, "", "/"));
  await waitFor(() => byId("metric-clients"));
});
it("never shows cached data from a previous user while another account is loading", async () => {
  const { testIdentity } = await import("./clerk");
  const original = globalThis.fetch;
  let resume!: () => void;
  const gate = new Promise<void>((resolve) => {
    resume = resolve;
  });
  testIdentity.userId = "review-second-user";
  globalThis.fetch = async (input: any, options: any = {}) => {
    await gate;
    return original(input, options);
  };
  await act(async () => root.render(<AppComponent key="second-user" />));
  expect(document.body.textContent).not.toContain("Customer Alpha");
  expect(document.body.textContent).not.toContain("Review payment");
  resume();
  await waitFor(() => byId("metric-clients")?.textContent?.includes("00"));
  expect(byId("count-overdue")?.textContent).toBe("0");
  globalThis.fetch = original;
  testIdentity.userId = "review-ui-user";
  await act(async () => root.render(<AppComponent key="first-user" />));
  await waitFor(() => byId("count-overdue")?.textContent === "1");
});
it("shows a retry state when parent data fails instead of presenting an empty workspace", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async (input: any, options: any = {}) =>
    String(input) === "/api/projects"
      ? new Response(JSON.stringify({ error: "Temporarily unavailable" }), {
          status: 503,
          headers: { "content-type": "application/json" },
        })
      : original(input, options);
  try {
    await act(async () => root.render(<AppComponent key="read-failure" />));
    await waitFor(() => byId("status-error"));
    expect(byId("onboarding")).toBeNull();
    globalThis.fetch = original;
    await click("button-retry");
    await waitFor(() => byId("metric-clients"));
    expect(byId("count-overdue")?.textContent).toBe("1");
  } finally {
    globalThis.fetch = original;
  }
});
