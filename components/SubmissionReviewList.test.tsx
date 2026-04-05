// @vitest-environment jsdom
// components/SubmissionReviewList.test.tsx
// Unit tests for the SubmissionReviewList React component
// Layer: Frontend UI — verifies submission loading, empty state, student name rendering, and review form fields
// FR9: Tutors can review and grade student submissions

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import SubmissionReviewList from "./SubmissionReviewList";

const mockSubmissions = [
  {
    id: 1,
    content: "My answer to the question.",
    submittedAt: "2024-05-01T10:00:00.000Z",
    reviewedAt: null,
    grade: null,
    feedback: null,
    student: { fullName: "Alice Student", email: "alice@example.com" },
    assignment: {
      title: "Essay on Calculus",
      course: { title: "Maths 101" },
    },
  },
  {
    id: 2,
    content: "My physics report.",
    submittedAt: "2024-05-02T12:00:00.000Z",
    reviewedAt: "2024-05-03T09:00:00.000Z",
    grade: 88,
    feedback: "Good work!",
    student: { fullName: "Bob Learner", email: "bob@example.com" },
    assignment: {
      title: "Physics Lab Report",
      course: { title: "Physics 201" },
    },
  },
];

describe("SubmissionReviewList", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  // FR9: Loading state shown while submissions are being fetched
  it('shows "Loading..." while fetching submissions (FR9)', () => {
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => {}));
    render(<SubmissionReviewList assignmentId={1} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  // FR9: Empty state shown when API returns no submissions
  it('shows "No submissions found." for an empty list (FR9)', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [] } as any);
    render(<SubmissionReviewList assignmentId={1} />);
    await waitFor(() =>
      expect(screen.getByText(/no submissions found/i)).toBeInTheDocument()
    );
  });

  // FR9: Student names are rendered for each submission
  it("renders student names for each submission (FR9)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockSubmissions,
    } as any);
    render(<SubmissionReviewList assignmentId={1} />);
    await waitFor(() => {
      expect(screen.getByText("Alice Student")).toBeInTheDocument();
      expect(screen.getByText("Bob Learner")).toBeInTheDocument();
    });
  });

  // FR9: Grade input and feedback textarea are present for each submission
  it("renders grade input and feedback textarea for each submission (FR9)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockSubmissions,
    } as any);
    render(<SubmissionReviewList assignmentId={1} />);
    await waitFor(() => expect(screen.getByText("Alice Student")).toBeInTheDocument());

    const gradeInputs = screen.getAllByPlaceholderText(/0-100/i);
    const feedbackTextareas = screen.getAllByPlaceholderText(/write feedback/i);
    expect(gradeInputs).toHaveLength(2);
    expect(feedbackTextareas).toHaveLength(2);
  });

  // FR9: "Mark as reviewed" button is present for unreviewed submissions
  it('shows "Mark as reviewed" button for unreviewed submissions (FR9)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockSubmissions,
    } as any);
    render(<SubmissionReviewList assignmentId={1} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /mark as reviewed/i })).toBeInTheDocument()
    );
  });

  // FR9: fetch is called with the correct assignmentId query param
  it("fetches with the correct assignmentId query param (FR9)", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [] } as any);
    render(<SubmissionReviewList assignmentId={99} />);
    await waitFor(() =>
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining("assignmentId=99")
      )
    );
  });

  // FR9: fetch is called with courseId when courseId prop is passed
  it("fetches with courseId query param when assignmentId is not given (FR9)", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [] } as any);
    render(<SubmissionReviewList courseId={5} />);
    await waitFor(() =>
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining("courseId=5")
      )
    );
  });

  // FR9: handleReview — successful PATCH shows "Saved!" feedback
  it('shows "Saved!" after a successful review submission (FR9)', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => mockSubmissions } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          submission: { grade: 90, feedback: "Good work", reviewedAt: "2024-05-03T00:00:00.000Z" },
        }),
      } as any);

    render(<SubmissionReviewList assignmentId={1} />);
    await waitFor(() => expect(screen.getByText("Alice Student")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /mark as reviewed/i }));

    await waitFor(() => expect(screen.getByText("Saved!")).toBeInTheDocument());
  });

  // FR9: handleReview — failed PATCH shows error message from API
  it("shows error message when review PATCH returns an error (FR9)", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => mockSubmissions } as any)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Not authorized" }),
      } as any);

    render(<SubmissionReviewList assignmentId={1} />);
    await waitFor(() => expect(screen.getByText("Alice Student")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /mark as reviewed/i }));

    await waitFor(() => expect(screen.getByText("Not authorized")).toBeInTheDocument());
  });

  // FR9: handleReview — network error falls back to generic message
  it('shows "Failed to save" on network error during review (FR9)', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => mockSubmissions } as any)
      .mockRejectedValueOnce(new Error("Network down"));

    render(<SubmissionReviewList assignmentId={1} />);
    await waitFor(() => expect(screen.getByText("Alice Student")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /mark as reviewed/i }));

    await waitFor(() => expect(screen.getByText("Failed to save")).toBeInTheDocument());
  });
});
