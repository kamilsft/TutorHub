// @vitest-environment jsdom
// components/SubmissionForm.test.tsx
// Unit tests for the SubmissionForm React component
// Layer: Frontend UI — verifies assignment loading, submit button, validation, and success flow
// FR8: Students can submit work for an assignment

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import SubmissionForm from "./SubmissionForm";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const mockAssignment = {
  id: 5,
  title: "Essay on Calculus",
  description: "Write a 500-word essay.",
  dueDate: "2099-12-01T23:59:00.000Z",
  createdAt: "2024-01-01T10:00:00.000Z",
  course: { id: 1, title: "Maths 101", subject: "Maths" },
  submissions: [],
};

describe("SubmissionForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  // FR8: Loading state shown while assignment is being fetched
  it('shows "Loading..." while fetching the assignment (FR8)', () => {
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => {}));
    render(<SubmissionForm assignmentId={5} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  // FR8: "Submit your work" heading visible once assignment loads with no prior submission
  it('shows "Submit your work" heading after assignment is loaded (FR8)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockAssignment,
    } as any);
    render(<SubmissionForm assignmentId={5} />);
    await waitFor(() =>
      expect(screen.getByText(/submit your work/i)).toBeInTheDocument()
    );
  });

  // FR8: Validation error when submitted with empty content
  it('shows "Please enter your submission." when submitted empty (FR8)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockAssignment,
    } as any);
    render(<SubmissionForm assignmentId={5} />);
    await waitFor(() => expect(screen.getByText(/submit your work/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() =>
      expect(screen.getByText(/please enter your submission/i)).toBeInTheDocument()
    );
  });

  // FR8: Successful submission shows "Submitted successfully!"
  it('shows "Submitted successfully!" after a successful POST (FR8)', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => mockAssignment } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 99, resubmitted: false }),
      } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => mockAssignment } as any);

    render(<SubmissionForm assignmentId={5} />);
    await waitFor(() => expect(screen.getByText(/submit your work/i)).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/type your answer/i), {
      target: { value: "My detailed answer here." },
    });
    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    await waitFor(() =>
      expect(screen.getByText(/submitted successfully/i)).toBeInTheDocument()
    );
  });

  // FR8: Assignment title and course info are shown after load
  it("displays the assignment title and course details after loading (FR8)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockAssignment,
    } as any);
    render(<SubmissionForm assignmentId={5} />);
    await waitFor(() => {
      expect(screen.getByText("Essay on Calculus")).toBeInTheDocument();
      expect(screen.getByText(/maths 101/i)).toBeInTheDocument();
    });
  });

  // FR8: Shows tutor feedback section when submission has been reviewed
  it("shows tutor feedback when submission has been reviewed (FR8)", async () => {
    const reviewedAssignment = {
      ...mockAssignment,
      submissions: [
        {
          id: 1,
          content: "My answer",
          reviewedAt: "2024-05-03T09:00:00.000Z",
          grade: 88,
          feedback: "Great work!",
          submittedAt: "2024-05-01T10:00:00.000Z",
        },
      ],
    };
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => reviewedAssignment } as any);
    render(<SubmissionForm assignmentId={5} />);
    await waitFor(() => expect(screen.getByText(/tutor feedback/i)).toBeInTheDocument());
    expect(screen.getByText(/great work!/i)).toBeInTheDocument();
  });

  // FR8: Shows pending review notice when submission exists but not yet reviewed
  it("shows pending review notice when submission is awaiting review (FR8)", async () => {
    const pendingAssignment = {
      ...mockAssignment,
      submissions: [
        {
          id: 1,
          content: "My answer",
          reviewedAt: null,
          grade: null,
          feedback: null,
          submittedAt: "2024-05-01T10:00:00.000Z",
        },
      ],
    };
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => pendingAssignment } as any);
    render(<SubmissionForm assignmentId={5} />);
    await waitFor(() => expect(screen.getByText(/pending review/i)).toBeInTheDocument());
  });

  // FR8: Shows "Resubmission saved!" when the server returns resubmitted=true
  it('shows "Resubmission saved!" when resubmitting (FR8)', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => mockAssignment } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 99, resubmitted: true }) } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => mockAssignment } as any);

    render(<SubmissionForm assignmentId={5} />);
    await waitFor(() => expect(screen.getByText(/submit your work/i)).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/type your answer/i), {
      target: { value: "My updated answer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    await waitFor(() => expect(screen.getByText(/resubmission saved/i)).toBeInTheDocument());
  });

  // FR8: Shows error message returned by the API when POST fails
  it("shows API error message when POST submission fails (FR8)", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => mockAssignment } as any)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Assignment not found" }),
      } as any);

    render(<SubmissionForm assignmentId={5} />);
    await waitFor(() => expect(screen.getByText(/submit your work/i)).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/type your answer/i), {
      target: { value: "My answer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    await waitFor(() => expect(screen.getByText(/assignment not found/i)).toBeInTheDocument());
  });

  // Error resilience: Shows error state when initial assignment fetch fails
  it("shows error state when assignment fetch fails (resilience)", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, json: async () => ({}) } as any);
    render(<SubmissionForm assignmentId={5} />);
    await waitFor(() =>
      expect(screen.getByText(/could not load assignment|failed to load/i)).toBeInTheDocument()
    );
  });
});
