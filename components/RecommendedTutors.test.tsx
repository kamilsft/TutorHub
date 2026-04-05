// @vitest-environment jsdom
// components/RecommendedTutors.test.tsx
// Unit tests for the RecommendedTutors React component
// Layer: Frontend UI — verifies fetch, loading state, empty state, data rendering, and error handling
// FR15: Students receive personalised tutor/course recommendations

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import RecommendedTutors from "./RecommendedTutors";

const mockRecommendations = [
  {
    tutorId: "t1",
    tutorName: "Carol Tutor",
    courseId: 1,
    courseTitle: "Maths 101",
    courseSubject: "Maths",
    courseLevel: "Beginner",
    coursePrice: 29.99,
    averageRating: 4.8,
    totalStudents: 15,
  },
  {
    tutorId: "t2",
    tutorName: "Dave Instructor",
    courseId: 2,
    courseTitle: "Physics 201",
    courseSubject: "Physics",
    courseLevel: "Intermediate",
    coursePrice: 0,
    averageRating: 4.2,
    totalStudents: 8,
  },
];

describe("RecommendedTutors", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  // FR15: Loading message shown while fetching recommendations
  it('shows "Loading recommendations..." while fetching (FR15)', () => {
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => {}));
    render(<RecommendedTutors studentId="s1" />);
    expect(screen.getByText(/loading recommendations/i)).toBeInTheDocument();
  });

  // FR15: Empty state shown when API returns an empty recommendations array
  it('shows "No recommendations yet." for an empty array (FR15)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: [] }),
    } as any);
    render(<RecommendedTutors studentId="s1" />);
    await waitFor(() =>
      expect(screen.getByText(/no recommendations yet/i)).toBeInTheDocument()
    );
  });

  // FR15: Tutor names and course titles are rendered when data is available
  it("renders tutor names and course titles from the API (FR15)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: mockRecommendations }),
    } as any);
    render(<RecommendedTutors studentId="s1" />);
    await waitFor(() => {
      expect(screen.getByText("Carol Tutor")).toBeInTheDocument();
      expect(screen.getByText("Dave Instructor")).toBeInTheDocument();
      expect(screen.getByText(/maths 101/i)).toBeInTheDocument();
      expect(screen.getByText(/physics 201/i)).toBeInTheDocument();
    });
  });

  // FR15: Error message shown when the fetch fails with a non-ok response
  it("shows an error message on API failure (FR15)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Service unavailable" }),
    } as any);
    render(<RecommendedTutors studentId="s1" />);
    await waitFor(() =>
      expect(screen.getByText(/service unavailable/i)).toBeInTheDocument()
    );
  });

  // FR15: Error message shown when fetch throws a network error
  it("shows a connection error message when fetch rejects (FR15)", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"));
    render(<RecommendedTutors studentId="s1" />);
    await waitFor(() =>
      expect(screen.getByText(/could not connect/i)).toBeInTheDocument()
    );
  });

  // FR15: fetch is called with the correct studentId query param
  it("fetches with the correct studentId query param (FR15)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: [] }),
    } as any);
    render(<RecommendedTutors studentId="abc-123" />);
    await waitFor(() =>
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.stringContaining("studentId=abc-123")
      )
    );
  });
});
