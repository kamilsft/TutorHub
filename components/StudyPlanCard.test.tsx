// @vitest-environment jsdom
// components/StudyPlanCard.test.tsx
// Unit tests for the StudyPlanCard React component
// Layer: Frontend UI — verifies plan header, progress, task rendering, and role-gated delete button
// FR12: Students can view their study plans
// FR13: Students can delete their study plans
// FR14: Tutors can view (but not delete) student study plans

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import StudyPlanCard from "./StudyPlanCard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/student/study-plan",
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const mockTasks = [
  {
    id: 1,
    title: "Read Chapter 1",
    courseId: "course-1",
    dueDate: "2099-06-01T00:00:00.000Z",
    completed: true,
  },
  {
    id: 2,
    title: "Complete exercises",
    courseId: "course-1",
    dueDate: "2099-07-01T00:00:00.000Z",
    completed: false,
  },
];

const baseProps = {
  planId: 7,
  studentName: "Jane",
  createdAt: "2024-01-15T10:00:00.000Z",
  tasks: mockTasks,
};

describe("StudyPlanCard", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  // FR12: Card header shows "<studentName>'s Plan"
  it("renders the student name heading (FR12)", () => {
    render(<StudyPlanCard {...baseProps} role="STUDENT" />);
    expect(screen.getByText(/jane's plan/i)).toBeInTheDocument();
  });

  // FR12: Progress percentage is displayed based on completed tasks
  it("shows the correct progress percentage (FR12)", () => {
    // 1 of 2 tasks completed = 50%
    render(<StudyPlanCard {...baseProps} role="STUDENT" />);
    expect(screen.getByText(/50%/i)).toBeInTheDocument();
  });

  // FR12: Task titles are rendered with checkboxes
  it("renders task titles with checkboxes (FR12)", () => {
    render(<StudyPlanCard {...baseProps} role="STUDENT" />);
    expect(screen.getByText(/read chapter 1/i)).toBeInTheDocument();
    expect(screen.getByText(/complete exercises/i)).toBeInTheDocument();
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(2);
  });

  // FR12: Edit link is always present
  it('renders an "Edit" link for the plan (FR12)', () => {
    render(<StudyPlanCard {...baseProps} role="STUDENT" />);
    expect(screen.getByRole("link", { name: /edit/i })).toBeInTheDocument();
  });

  // FR13: Delete button is shown for STUDENT role
  it('shows the "Delete" button for STUDENT role (FR13)', () => {
    render(<StudyPlanCard {...baseProps} role="STUDENT" />);
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  // FR14: Delete button is NOT shown for TUTOR role
  it('does not show "Delete" button for TUTOR role (FR14)', () => {
    render(<StudyPlanCard {...baseProps} role="TUTOR" />);
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  // FR12: Toggling a checkbox calls PATCH /api/tasks/:id with the updated completed value
  it("calls PATCH /api/tasks/:id when a checkbox is toggled (FR12)", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as any);
    render(<StudyPlanCard {...baseProps} role="STUDENT" />);
    const checkboxes = screen.getAllByRole("checkbox");
    // second task (id=2) is incomplete — check it
    fireEvent.click(checkboxes[1]);
    await waitFor(() =>
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        "/api/tasks/2",
        expect.objectContaining({ method: "PATCH" })
      )
    );
  });

  // Error resilience: fetch failure in handleToggle should not crash the component
  it("handles PATCH error gracefully without crashing (resilience)", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"));
    render(<StudyPlanCard {...baseProps} role="STUDENT" />);
    const checkboxes = screen.getAllByRole("checkbox");
    // Should not throw even when fetch rejects
    fireEvent.click(checkboxes[0]);
    await waitFor(() =>
      expect(screen.getByText(/read chapter 1/i)).toBeInTheDocument()
    );
  });
});
