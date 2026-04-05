// @vitest-environment jsdom
// components/DeleteStudyPlan.test.tsx
// Unit tests for the DeleteStudyPlanButton React component
// Layer: Frontend UI — verifies button rendering, DELETE API call on confirmation, and error alert on failure
// FR13: Students can delete their own study plans

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import DeleteStudyPlanButton from "./DeleteStudyPlan";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/student/study-plan",
}));

describe("DeleteStudyPlanButton", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    // Always confirm the dialog by default
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal("alert", vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  // FR13: A red "Delete" button is rendered
  it('renders a "Delete" button (FR13)', () => {
    render(<DeleteStudyPlanButton planId={3} />);
    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();
  });

  // FR13: Clicking "Delete" calls DELETE /api/study-plans/{planId} when user confirms
  it("calls DELETE /api/study-plans/{planId} when the user confirms (FR13)", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({}) } as any);
    render(<DeleteStudyPlanButton planId={3} />);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() =>
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        "/api/study-plans/3",
        expect.objectContaining({ method: "DELETE" })
      )
    );
  });

  // FR13: No fetch call is made when the user cancels the confirm dialog
  it("does not call fetch when user cancels the confirm dialog (FR13)", () => {
    vi.mocked(confirm).mockReturnValueOnce(false as any);
    render(<DeleteStudyPlanButton planId={3} />);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  // FR13: An alert is shown when the API responds with a non-ok status
  it("shows an alert when the API returns a non-ok response (FR13)", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as any);
    render(<DeleteStudyPlanButton planId={3} />);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() =>
      expect(vi.mocked(alert)).toHaveBeenCalledWith(
        expect.stringMatching(/failed to delete/i)
      )
    );
  });

  // FR13: An alert is shown when the fetch call throws a network error
  it("shows an alert when fetch throws a network error (FR13)", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"));
    render(<DeleteStudyPlanButton planId={3} />);

    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() =>
      expect(vi.mocked(alert)).toHaveBeenCalledWith(
        expect.stringMatching(/error deleting/i)
      )
    );
  });
});
