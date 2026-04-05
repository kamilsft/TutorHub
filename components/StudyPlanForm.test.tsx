// @vitest-environment jsdom
// components/StudyPlanForm.test.tsx
// Unit tests for the StudyPlanForm React component
// Layer: Frontend UI — verifies task management, save behavior, and HTTP method selection

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import StudyPlanForm from "./StudyPlanForm";

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

  // NFR4: saving with an incomplete task (missing title) shows an alert and does not call the API
  it("alerts and does not call API when a task is missing its title (NFR4)", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [] } as any);
    render(<StudyPlanForm />);

    // Leave task title empty, click Save Plan
    const saveBtn = screen.getByRole("button", { name: /save plan/i });
    fireEvent.click(saveBtn);

    expect(alert).toHaveBeenCalledWith("Please fill all fields for each task");
    expect(fetch).toHaveBeenCalledTimes(1); // only the course-loading fetch, not the save
  });

  // FR12: a new plan (no planId) is submitted via POST /api/study-plans
  // The body must NOT include studentId — server reads it from the JWT (NFR2)
  it("POSTs to /api/study-plans without studentId when creating a new plan (FR12 + NFR2)", async () => {
    // First fetch: enrolled courses (returns one course)
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 1, title: "Maths" }] } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 10, tasks: [] }) } as any);

    render(<StudyPlanForm />);

    // Wait for courses to load
    await waitFor(() => screen.getByRole("option", { name: "Maths" }));

    // Fill in the task
    fireEvent.change(screen.getByPlaceholderText("Task title"), {
      target: { value: "Study chapter 1" },
    });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "1" } });
    fireEvent.change(screen.getByRole("textbox", { hidden: true }), { target: {} }); // date handled below
    // Use querySelector for date input (type="date")
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
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ courses: [{ id: 1, title: "Maths" }] }),
      } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 5, tasks: [] }) } as any);

    const initialTasks = [
      { title: "Read chapter 1", courseId: 1, dueDate: "2026-06-01T00:00:00.000Z", completed: false },
    ];
    render(<StudyPlanForm planId={5} initialTasks={initialTasks} />);

    await waitFor(() => screen.getByRole("option", { name: "Maths" }));
    fireEvent.click(screen.getByRole("button", { name: /save plan/i }));

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

  // Error path: API returns non-ok response — alerts the error message from server
  it("alerts server error message when API returns failure (error path)", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 1, title: "Maths" }] } as any)
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Server error" }) } as any);

    render(<StudyPlanForm />);
    await waitFor(() => screen.getByRole("option", { name: "Maths" }));

    fireEvent.change(screen.getByPlaceholderText("Task title"), { target: { value: "Study" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "1" } });
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: "2026-06-01" } });

    fireEvent.click(screen.getByRole("button", { name: /save plan/i }));

    await waitFor(() => expect(alert).toHaveBeenCalledWith("Server error"));
  });

  // Error path: fetch throws a network error — alerts generic message
  it("alerts generic error when fetch throws a network error (error path)", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 1, title: "Maths" }] } as any)
      .mockRejectedValueOnce(new Error("Network error"));

    render(<StudyPlanForm />);
    await waitFor(() => screen.getByRole("option", { name: "Maths" }));

    fireEvent.change(screen.getByPlaceholderText("Task title"), { target: { value: "Study" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "1" } });
    const dateInput2 = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput2, { target: { value: "2026-06-01" } });

    fireEvent.click(screen.getByRole("button", { name: /save plan/i }));

    await waitFor(() => expect(alert).toHaveBeenCalledWith("Error saving study plan"));
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
