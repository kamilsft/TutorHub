// @vitest-environment jsdom
// components/CreateAssignmentForm.test.tsx
// Unit tests for the CreateAssignmentForm React component
// Layer: Frontend UI — verifies course loading, select rendering, validation errors, and success flow
// FR7: Tutors can create assignments for their courses

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import CreateAssignmentForm from "./CreateAssignmentForm";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/tutor/assignments",
}));

const mockCourses = [
  { id: 1, title: "Maths 101", subject: "Maths" },
  { id: 2, title: "Physics 201", subject: "Physics" },
];

describe("CreateAssignmentForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  // FR7: "Loading courses…" shown while the initial course fetch is in flight
  it('shows "Loading courses..." while fetching tutor courses (FR7)', () => {
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => {}));
    render(<CreateAssignmentForm />);
    expect(screen.getByText(/loading courses/i)).toBeInTheDocument();
  });

  // FR7: Course select dropdown is rendered after courses load
  it("renders a course select dropdown after courses are fetched (FR7)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockCourses,
    } as any);
    render(<CreateAssignmentForm />);
    await waitFor(() =>
      expect(screen.getByRole("combobox")).toBeInTheDocument()
    );
    expect(screen.getByRole("option", { name: /maths 101/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /physics 201/i })).toBeInTheDocument();
  });

  // FR7: Validation error when form is submitted without required fields
  it('shows validation error "Please select a course and enter a title." when submitted empty (FR7)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockCourses,
    } as any);
    render(<CreateAssignmentForm />);
    await waitFor(() => expect(screen.getByRole("combobox")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /create assignment/i }));

    await waitFor(() =>
      expect(
        screen.getByText(/please select a course and enter a title/i)
      ).toBeInTheDocument()
    );
  });

  // FR7: Success message shown after a successful POST
  it("shows success message after assignment is created successfully (FR7)", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => mockCourses } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 99, title: "New Task" }),
      } as any);

    render(<CreateAssignmentForm />);
    await waitFor(() => expect(screen.getByRole("combobox")).toBeInTheDocument());

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "1" } });
    // The title input has no htmlFor, so find it by placeholder text
    fireEvent.change(screen.getAllByRole("textbox")[0], {
      target: { value: "New Task" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create assignment/i }));

    await waitFor(() =>
      expect(screen.getByText(/new task.*created/i)).toBeInTheDocument()
    );
  });

  // FR7: Shows fallback message when tutor has no courses
  it('shows "No courses found." message when API returns empty array (FR7)', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [] } as any);
    render(<CreateAssignmentForm />);
    await waitFor(() =>
      expect(screen.getByText(/no courses found/i)).toBeInTheDocument()
    );
  });
});
