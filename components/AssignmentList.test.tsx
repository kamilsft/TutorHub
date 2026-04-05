// @vitest-environment jsdom
// components/AssignmentList.test.tsx
// Unit tests for the AssignmentList React component
// Layer: Frontend UI — verifies fetch calls, loading state, empty state, assignment rendering, and role-based action links
// FR7: Tutors can create assignments; FR9: Tutors can review student submissions

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import AssignmentList from "./AssignmentList";

const mockAssignments = [
  {
    id: 10,
    title: "Essay on Calculus",
    description: "Write a 500-word essay.",
    dueDate: "2099-12-01T23:59:00.000Z",
    createdAt: "2024-01-01T10:00:00.000Z",
    course: { id: 1, title: "Maths 101", subject: "Maths" },
    _count: { submissions: 3 },
  },
  {
    id: 11,
    title: "Physics Lab Report",
    description: null,
    dueDate: null,
    createdAt: "2024-02-01T10:00:00.000Z",
    course: { id: 2, title: "Physics 201", subject: "Physics" },
    _count: { submissions: 0 },
  },
];

describe("AssignmentList", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  // UX: "Loading..." shown while the initial assignment fetch is in flight
  it("shows loading state while fetching assignments (FR7)", async () => {
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => {}));
    render(<AssignmentList courseId={1} role="STUDENT" />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  // FR7: empty state — shown when API returns no assignments
  it('shows "No assignments found." when API returns an empty array (FR7)', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [] } as any);
    render(<AssignmentList courseId={1} role="STUDENT" />);
    await waitFor(() =>
      expect(screen.getByText(/no assignments found/i)).toBeInTheDocument()
    );
  });

  // FR7: assignment titles are rendered for both roles
  it("renders assignment titles from the API (FR7)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockAssignments,
    } as any);
    render(<AssignmentList courseId={1} role="STUDENT" />);
    await waitFor(() => {
      expect(screen.getByText("Essay on Calculus")).toBeInTheDocument();
      expect(screen.getByText("Physics Lab Report")).toBeInTheDocument();
    });
  });

  // FR7: STUDENT role sees "View / Submit" action link
  it('shows "View / Submit" link for STUDENT role (FR7)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockAssignments,
    } as any);
    render(<AssignmentList courseId={1} role="STUDENT" />);
    await waitFor(() => {
      const links = screen.getAllByRole("link", { name: /view \/ submit/i });
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute(
        "href",
        `/dashboard/student/assignments/10`
      );
    });
  });

  // FR9: TUTOR role sees "Review (N)" action link with submission count
  it('shows "Review (N)" link for TUTOR role with correct submission count (FR9)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockAssignments,
    } as any);
    render(<AssignmentList courseId={1} role="TUTOR" />);
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /review \(3\)/i })).toBeInTheDocument();
    });
  });

  // FR7: fetch is called with the correct courseId query param
  it("fetches assignments with the correct courseId query param (FR7)", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [] } as any);
    render(<AssignmentList courseId={42} role="STUDENT" />);
    await waitFor(() => {
      const [url] = vi.mocked(fetch).mock.calls[0] as [string];
      expect(url).toContain("courseId=42");
    });
  });

  // FR7: TUTOR role does not show "View / Submit" links
  it("does not show student action links for TUTOR role (FR7)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockAssignments,
    } as any);
    render(<AssignmentList courseId={1} role="TUTOR" />);
    await waitFor(() => expect(screen.getByText("Essay on Calculus")).toBeInTheDocument());
    expect(screen.queryByText(/view \/ submit/i)).not.toBeInTheDocument();
  });
});
