// @vitest-environment jsdom
// components/StudyPlanForm.test.tsx
// Unit tests for the StudyPlanForm React component
// Layer: Frontend UI — verifies task management, save behavior, and HTTP method selection

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import StudyPlanForm from "./StudyPlanForm";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));

describe("StudyPlanForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    // Mock window.alert so Jest doesn't complain about it
    vi.stubGlobal("alert", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Smoke test: one empty task row is rendered on mount when no initialTasks are provided
  it("renders one task row on initial mount", () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [] } as any);
    render(<StudyPlanForm />);
    expect(screen.getByPlaceholderText("Task title")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ add task/i })).toBeInTheDocument();
  });

  // FR12: the "+ Add Task" button adds a new task row to the form
  it("adds a new task row when the Add Task button is clicked (FR12)", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [] } as any);
    render(<StudyPlanForm />);

    const addBtn = screen.getByRole("button", { name: /\+ add task/i });
    fireEvent.click(addBtn);

    // Should now have 2 task title inputs
    const titleInputs = screen.getAllByPlaceholderText("Task title");
    expect(titleInputs).toHaveLength(2);
  });

  // FR12: pre-populating with initialTasks renders a row for each task
  it("renders one row per initialTask when initialTasks are provided (FR13 edit mode)", () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [] } as any);
    const initialTasks = [
      { title: "Read chapter 1", courseId: 1, dueDate: "2026-06-01T00:00:00.000Z", completed: false },
      { title: "Do exercises", courseId: 1, dueDate: "2026-06-08T00:00:00.000Z", completed: false },
    ];
    render(<StudyPlanForm planId={5} initialTasks={initialTasks} />);

    const titleInputs = screen.getAllByPlaceholderText("Task title");
    expect(titleInputs).toHaveLength(2);
    expect((titleInputs[0] as HTMLInputElement).value).toBe("Read chapter 1");
    expect((titleInputs[1] as HTMLInputElement).value).toBe("Do exercises");
  });

  // NFR4: saving with an incomplete task (missing title) shows an error and does not call the API
  it("shows error and does not call save API when a task is missing its title (NFR4)", async () => {
    render(<StudyPlanForm availableCourses={[{ id: "1", title: "Maths" }]} />);

    // Leave task title empty, click Save Plan
    fireEvent.click(screen.getByRole("button", { name: /save plan/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/please complete title, course, and due date/i)
      ).toBeInTheDocument();
    });

    // No save fetch call should have been made
    const saveCalls = vi.mocked(fetch).mock.calls.filter(([, opts]: any) =>
      opts?.method === "POST" || opts?.method === "PUT"
    );
    expect(saveCalls).toHaveLength(0);
  });

  // FR12: a new plan (no planId) is submitted via POST /api/study-plans
  // The body must NOT include studentId — server reads it from the JWT (NFR2)
  it("POSTs to /api/study-plans without studentId when creating a new plan (FR12 + NFR2)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 10, tasks: [] }),
    } as any);

    // Pass availableCourses directly so no fetch needed for course loading
    render(<StudyPlanForm availableCourses={[{ id: "1", title: "Maths" }]} />);

    await waitFor(() => screen.getByRole("option", { name: "Maths" }));

    fireEvent.change(screen.getByPlaceholderText("Task title"), {
      target: { value: "Study chapter 1" },
    });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "1" } });
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2026-06-01" } });

    fireEvent.click(screen.getByRole("button", { name: /save plan/i }));

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls;
      const saveCall = calls.find(([url, opts]) =>
        (opts as RequestInit)?.method === "POST" && String(url).includes("study-plans")
      );
      expect(saveCall).toBeDefined();
      const body = JSON.parse((saveCall![1] as RequestInit).body as string);
      expect(body).not.toHaveProperty("studentId");
      expect(body.tasks[0].title).toBe("Study chapter 1");
    });
  });

  // FR13: editing an existing plan (planId provided) uses PUT instead of POST
  it("PUTs to /api/study-plans when editing an existing plan (FR13)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 5, tasks: [] }),
    } as any);

    const initialTasks = [
      { title: "Read chapter 1", courseId: 1, dueDate: "2026-06-01T00:00:00.000Z", completed: false },
    ];
    // Pass availableCourses directly so no fetch needed for course loading
    render(
      <StudyPlanForm
        planId={5}
        initialTasks={initialTasks}
        availableCourses={[{ id: "1", title: "Maths" }]}
      />
    );

    await waitFor(() => screen.getByRole("option", { name: "Maths" }));
    // When planId is set, the default button label is "Update plan"
    fireEvent.click(screen.getByRole("button", { name: /update plan/i }));

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls;
      const putCall = calls.find(([url, opts]) =>
        (opts as RequestInit)?.method === "PUT" && String(url).includes("study-plans")
      );
      expect(putCall).toBeDefined();
      const body = JSON.parse((putCall![1] as RequestInit).body as string);
      expect(body.planId).toBe(5);
    });
  });

  // FR12/13: copy-plan — saveButtonLabel prop is rendered on the save button
  it("renders custom saveButtonLabel on the save button (copy-plan flow)", () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [] } as any);
    render(<StudyPlanForm saveButtonLabel="Save copied plan" />);
    expect(screen.getByRole("button", { name: /save copied plan/i })).toBeInTheDocument();
  });

  // FR12/13: copy-plan — initialTasks pre-fill the form (simulates ?copyFrom= flow)
  it("pre-fills tasks from initialTasks when copying a plan (FR12/13)", () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [] } as any);
    const copiedTasks = [
      { title: "Copied task 1", courseId: 2, dueDate: "2026-07-01T00:00:00.000Z", completed: false },
      { title: "Copied task 2", courseId: 2, dueDate: "2026-07-08T00:00:00.000Z", completed: true },
    ];
    render(<StudyPlanForm initialTasks={copiedTasks} saveButtonLabel="Save copied plan" />);
    const titleInputs = screen.getAllByPlaceholderText("Task title");
    expect(titleInputs).toHaveLength(2);
    expect((titleInputs[0] as HTMLInputElement).value).toBe("Copied task 1");
    expect((titleInputs[1] as HTMLInputElement).value).toBe("Copied task 2");
  });

  // FR12/13: availableCourses prop — courses passed in are shown in the dropdown
  it("renders availableCourses in the course dropdown (FR12/13)", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [] } as any);
    const courses = [
      { id: "3", title: "Physics 101" },
      { id: "4", title: "Chemistry 202" },
    ];
    render(<StudyPlanForm availableCourses={courses} />);
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Physics 101" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Chemistry 202" })).toBeInTheDocument();
    });
  });

  // UX: Save Plan button shows "Saving…" while the request is in flight
  it('shows "Saving…" while the plan is being saved', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 1, title: "Maths" }] } as any)
      .mockImplementationOnce(() => new Promise(() => {})); // save never resolves

    render(<StudyPlanForm />);
    await waitFor(() => screen.getByRole("option", { name: "Maths" }));

    fireEvent.change(screen.getByPlaceholderText("Task title"), {
      target: { value: "Study" },
    });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "1" } });
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2026-06-01" } });

    fireEvent.click(screen.getByRole("button", { name: /save plan/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    });
  });
});
