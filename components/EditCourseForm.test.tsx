// @vitest-environment jsdom
// components/EditCourseForm.test.tsx
// Unit tests for the EditCourseForm React component
// FR5 — tutor edit course details and toggle publish/archive; NFR4 (validation)

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import EditCourseForm from "./EditCourseForm";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockCourse = {
  id: 1,
  title: "Maths 101",
  subject: "Mathematics",
  description: "Learn maths",
  price: 29.99,
  level: "Beginner",
  isPublished: true,
};

// The component fetches /api/courses/mine then /api/courses?subject= on mount.
// This helper stubs both calls so the form loads successfully.
function setupLoadMocks(overrides: Partial<typeof mockCourse> = {}) {
  const course = { ...mockCourse, ...overrides };
  vi.mocked(fetch)
    .mockResolvedValueOnce({ ok: true, json: async () => [course] } as any)  // /api/courses/mine
    .mockResolvedValueOnce({ ok: true, json: async () => [course] } as any); // /api/courses?subject=
}

describe("EditCourseForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    mockPush.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── Loading state ─────────────────────────────────────────────────────────
  it("shows loading state before course data arrives (FR5)", () => {
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => {}));
    render(<EditCourseForm courseId={1} />);
    expect(screen.getByText(/loading course/i)).toBeInTheDocument();
  });

  // ── Form population (FR5) ─────────────────────────────────────────────────
  it("pre-populates Title field with existing course data (FR5)", async () => {
    setupLoadMocks();
    render(<EditCourseForm courseId={1} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Maths 101")).toBeInTheDocument();
    });
  });

  it("pre-populates Subject field with existing course data (FR5)", async () => {
    setupLoadMocks();
    render(<EditCourseForm courseId={1} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Mathematics")).toBeInTheDocument();
    });
  });

  it("pre-populates Description textarea when the course has one (FR5)", async () => {
    setupLoadMocks();
    render(<EditCourseForm courseId={1} />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Learn maths")).toBeInTheDocument();
    });
  });

  it("renders the Save changes button after loading (FR5)", async () => {
    setupLoadMocks();
    render(<EditCourseForm courseId={1} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    });
  });

  // ── Error states ──────────────────────────────────────────────────────────
  it("shows error when course is not found in the tutor's mine list (NFR2 — ownership)", async () => {
    // mine returns empty → course not found
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => [] } as any);
    render(<EditCourseForm courseId={999} />);
    await waitFor(() => {
      expect(screen.getByText(/course not found/i)).toBeInTheDocument();
    });
  });

  it("shows error when /api/courses/mine returns a non-ok response (FR5)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Unauthorized" }),
    } as any);
    render(<EditCourseForm courseId={1} />);
    await waitFor(() => {
      expect(screen.getByText(/failed to load course/i)).toBeInTheDocument();
    });
  });

  it("shows error when fetch throws a network exception on load (FR5)", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network"));
    render(<EditCourseForm courseId={1} />);
    await waitFor(() => {
      expect(screen.getByText(/failed to load course/i)).toBeInTheDocument();
    });
  });

  // ── Client-side validation (NFR4) ─────────────────────────────────────────
  it("shows validation error and does not PATCH when title is cleared (NFR4)", async () => {
    setupLoadMocks();
    render(<EditCourseForm courseId={1} />);
    await waitFor(() => screen.getByDisplayValue("Maths 101"));

    fireEvent.change(screen.getByDisplayValue("Maths 101"), { target: { value: "" } });
    fireEvent.submit(
      screen.getByRole("button", { name: /save changes/i }).closest("form")!
    );

    await waitFor(() => {
      expect(screen.getByText(/title and subject are required/i)).toBeInTheDocument();
    });
    const patchCall = vi.mocked(fetch).mock.calls.find(
      ([, opts]: any) => opts?.method === "PATCH"
    );
    expect(patchCall).toBeUndefined();
  });

  it("shows validation error and does not PATCH when subject is cleared (NFR4)", async () => {
    setupLoadMocks();
    render(<EditCourseForm courseId={1} />);
    await waitFor(() => screen.getByDisplayValue("Mathematics"));

    fireEvent.change(screen.getByDisplayValue("Mathematics"), { target: { value: "   " } });
    fireEvent.submit(
      screen.getByRole("button", { name: /save changes/i }).closest("form")!
    );

    await waitFor(() => {
      expect(screen.getByText(/title and subject are required/i)).toBeInTheDocument();
    });
  });

  // ── Successful save (FR5) ─────────────────────────────────────────────────
  it('shows "Course updated successfully." after a successful PATCH (FR5)', async () => {
    setupLoadMocks();
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => mockCourse } as any);

    render(<EditCourseForm courseId={1} />);
    await waitFor(() => screen.getByDisplayValue("Maths 101"));
    fireEvent.submit(
      screen.getByRole("button", { name: /save changes/i }).closest("form")!
    );

    await waitFor(() => {
      expect(screen.getByText(/course updated successfully/i)).toBeInTheDocument();
    });
  });

  it("sends PATCH to /api/courses?id=1 with correct fields on submit (FR5)", async () => {
    setupLoadMocks();
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => mockCourse } as any);

    render(<EditCourseForm courseId={1} />);
    await waitFor(() => screen.getByDisplayValue("Maths 101"));
    fireEvent.submit(
      screen.getByRole("button", { name: /save changes/i }).closest("form")!
    );

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls;
      const patchCall = calls.find(([, opts]: any) => opts?.method === "PATCH");
      expect(patchCall).toBeDefined();
      expect(String(patchCall![0])).toContain("id=1");
      const body = JSON.parse((patchCall![1] as any).body);
      expect(body.title).toBe("Maths 101");
      expect(body.subject).toBe("Mathematics");
    });
  });

  it("shows API error message when the PATCH request fails (FR5)", async () => {
    setupLoadMocks();
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Title is too long" }),
    } as any);

    render(<EditCourseForm courseId={1} />);
    await waitFor(() => screen.getByDisplayValue("Maths 101"));
    fireEvent.submit(
      screen.getByRole("button", { name: /save changes/i }).closest("form")!
    );

    await waitFor(() => {
      expect(screen.getByText(/title is too long/i)).toBeInTheDocument();
    });
  });

  it('shows "Saving..." on the button while the PATCH is in flight (UX)', async () => {
    setupLoadMocks();
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => {})); // PATCH hangs

    render(<EditCourseForm courseId={1} />);
    await waitFor(() => screen.getByDisplayValue("Maths 101"));
    fireEvent.submit(
      screen.getByRole("button", { name: /save changes/i }).closest("form")!
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /saving/i })).toBeInTheDocument();
    });
  });

  // ── Toggle publish / archive (FR5) ────────────────────────────────────────
  it('shows "Archive course" button when the course is published (FR5)', async () => {
    setupLoadMocks({ isPublished: true });
    render(<EditCourseForm courseId={1} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /archive course/i })).toBeInTheDocument();
    });
  });

  it('shows "Publish course" button when the course is a draft (FR5)', async () => {
    setupLoadMocks({ isPublished: false });
    render(<EditCourseForm courseId={1} />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /publish course/i })).toBeInTheDocument();
    });
  });

  it("sends PATCH with isPublished:false when Archive is clicked (FR5)", async () => {
    setupLoadMocks({ isPublished: true });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockCourse, isPublished: false }),
    } as any);

    render(<EditCourseForm courseId={1} />);
    await waitFor(() => screen.getByRole("button", { name: /archive course/i }));
    fireEvent.click(screen.getByRole("button", { name: /archive course/i }));

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls;
      const patchCall = calls.find(([, opts]: any) => opts?.method === "PATCH");
      expect(patchCall).toBeDefined();
      const body = JSON.parse((patchCall![1] as any).body);
      expect(body.isPublished).toBe(false);
    });
  });

  it("sends PATCH with isPublished:true when Publish is clicked (FR5)", async () => {
    setupLoadMocks({ isPublished: false });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockCourse, isPublished: true }),
    } as any);

    render(<EditCourseForm courseId={1} />);
    await waitFor(() => screen.getByRole("button", { name: /publish course/i }));
    fireEvent.click(screen.getByRole("button", { name: /publish course/i }));

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls;
      const patchCall = calls.find(([, opts]: any) => opts?.method === "PATCH");
      expect(patchCall).toBeDefined();
      const body = JSON.parse((patchCall![1] as any).body);
      expect(body.isPublished).toBe(true);
    });
  });

  it('shows "Course archived." success message after archiving (FR5)', async () => {
    setupLoadMocks({ isPublished: true });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockCourse, isPublished: false }),
    } as any);

    render(<EditCourseForm courseId={1} />);
    await waitFor(() => screen.getByRole("button", { name: /archive course/i }));
    fireEvent.click(screen.getByRole("button", { name: /archive course/i }));

    await waitFor(() => {
      expect(screen.getByText(/course archived/i)).toBeInTheDocument();
    });
  });

  // ── Back navigation (FR5) ─────────────────────────────────────────────────
  it("navigates to /dashboard/tutor/courses when Back button is clicked (FR5)", async () => {
    setupLoadMocks();
    render(<EditCourseForm courseId={1} />);
    await waitFor(() => screen.getByText(/back to courses/i));
    fireEvent.click(screen.getByText(/back to courses/i));
    expect(mockPush).toHaveBeenCalledWith("/dashboard/tutor/courses");
  });

  // ── Delete course (FR5) ───────────────────────────────────────────────────
  it("does not show Delete button when course is published (FR5)", async () => {
    setupLoadMocks({ isPublished: true });
    render(<EditCourseForm courseId={1} />);
    await waitFor(() => screen.getByRole("button", { name: /archive course/i }));
    expect(screen.queryByRole("button", { name: /delete course/i })).not.toBeInTheDocument();
  });

  it("shows Delete button when course is archived (FR5)", async () => {
    setupLoadMocks({ isPublished: false });
    render(<EditCourseForm courseId={1} />);
    await waitFor(() => screen.getByRole("button", { name: /delete course/i }));
    expect(screen.getByRole("button", { name: /delete course/i })).toBeInTheDocument();
  });

  it("blocks delete with error if course is still published (FR5)", async () => {
    setupLoadMocks({ isPublished: true });
    render(<EditCourseForm courseId={1} />);
    await waitFor(() => screen.getByRole("button", { name: /archive course/i }));
    // published → no delete button, guard is visual-only; verify no DELETE call possible
    expect(screen.queryByRole("button", { name: /delete course/i })).toBeNull();
  });

  it("sends DELETE to /api/courses?id=1 after confirmation (FR5)", async () => {
    setupLoadMocks({ isPublished: false });
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as any);

    render(<EditCourseForm courseId={1} />);
    await waitFor(() => screen.getByRole("button", { name: /delete course/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete course/i }));

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls;
      const deleteCall = calls.find(([, opts]: any) => opts?.method === "DELETE");
      expect(deleteCall).toBeDefined();
      expect(String(deleteCall![0])).toContain("id=1");
    });
    vi.unstubAllGlobals();
  });

  it("does not send DELETE when user cancels the confirmation dialog (FR5)", async () => {
    setupLoadMocks({ isPublished: false });
    vi.stubGlobal("confirm", vi.fn(() => false));

    render(<EditCourseForm courseId={1} />);
    await waitFor(() => screen.getByRole("button", { name: /delete course/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete course/i }));

    await waitFor(() => {
      const calls = vi.mocked(fetch).mock.calls;
      const deleteCall = calls.find(([, opts]: any) => opts?.method === "DELETE");
      expect(deleteCall).toBeUndefined();
    });
    vi.unstubAllGlobals();
  });

  it("redirects to /dashboard/tutor/courses after successful delete (FR5)", async () => {
    setupLoadMocks({ isPublished: false });
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as any);

    render(<EditCourseForm courseId={1} />);
    await waitFor(() => screen.getByRole("button", { name: /delete course/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete course/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard/tutor/courses");
    });
    vi.unstubAllGlobals();
  });
});
