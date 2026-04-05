// @vitest-environment jsdom
// components/CourseEnrollClient.test.tsx
// Unit tests for the CourseEnrollClient React component
// Layer: Frontend UI — verifies enroll button states, capacity/publish guards, and error messages
// FR6: Students can enroll in published courses with available capacity
// NFR1: User-friendly error messages for invalid enrollment attempts

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import CourseEnrollClient from "./CourseEnrollClient";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/courses/1",
}));

describe("CourseEnrollClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  // FR6: Default state shows an enabled "Enroll" button
  it('renders an "Enroll" button when not yet joined (FR6)', () => {
    render(
      <CourseEnrollClient
        courseId={1}
        isPublished={true}
        capacity={30}
        enrolledCount={10}
      />
    );
    expect(screen.getByRole("button", { name: /enroll/i })).toBeInTheDocument();
  });

  // FR6: When initiallyJoined=true the button shows "Enrolled" and is disabled
  it('shows disabled "Enrolled" button when initiallyJoined is true (FR6)', () => {
    render(
      <CourseEnrollClient
        courseId={1}
        isPublished={true}
        capacity={30}
        enrolledCount={10}
        initiallyJoined={true}
      />
    );
    const btn = screen.getByRole("button", { name: /enrolled/i });
    expect(btn).toBeDisabled();
  });

  // NFR1: Enroll button is disabled when course is at capacity
  it("button is disabled when capacity is reached (NFR1)", () => {
    render(
      <CourseEnrollClient
        courseId={1}
        isPublished={true}
        capacity={10}
        enrolledCount={10}
      />
    );
    expect(screen.getByRole("button", { name: /enroll/i })).toBeDisabled();
  });

  // NFR1: Enroll button is disabled when course is not published
  it("button is disabled when course is not published (NFR1)", () => {
    render(
      <CourseEnrollClient
        courseId={1}
        isPublished={false}
        capacity={30}
        enrolledCount={5}
      />
    );
    expect(screen.getByRole("button", { name: /enroll/i })).toBeDisabled();
  });

  // FR6: Successful enrollment calls POST /api/enrollments and updates button to "Enrolled"
  it('calls POST /api/enrollments and shows "Enrolled" on success (FR6)', async () => {
    Object.defineProperty(document, "cookie", {
      writable: true,
      value: "authToken=abc123",
    });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as any);

    render(
      <CourseEnrollClient
        courseId={5}
        isPublished={true}
        capacity={null}
        enrolledCount={0}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /enroll/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /enrolled/i })).toBeDisabled()
    );
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/api/enrollments",
      expect.objectContaining({ method: "POST" })
    );
  });

  // NFR1: Shows error message when enrollment API returns failure
  it("shows error message when enrollment API fails (NFR1)", async () => {
    Object.defineProperty(document, "cookie", { writable: true, value: "authToken=abc123" });
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Already enrolled" }),
    } as any);

    render(
      <CourseEnrollClient courseId={1} isPublished={true} capacity={null} enrolledCount={0} />
    );
    fireEvent.click(screen.getByRole("button", { name: /enroll/i }));

    await waitFor(() => expect(screen.getByText(/already enrolled/i)).toBeInTheDocument());
  });

  // Error resilience: Shows generic error when fetch throws
  it("shows generic error when enrollment fetch throws (resilience)", async () => {
    Object.defineProperty(document, "cookie", { writable: true, value: "authToken=abc123" });
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

    render(
      <CourseEnrollClient courseId={1} isPublished={true} capacity={null} enrolledCount={0} />
    );
    fireEvent.click(screen.getByRole("button", { name: /enroll/i }));

    await waitFor(() => expect(screen.getByText(/failed to enroll/i)).toBeInTheDocument());
  });
});
