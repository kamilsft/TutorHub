// @vitest-environment jsdom
// components/DashboardFrame.test.tsx
// Unit tests for the DashboardFrame React component
// Layer: Frontend UI — verifies role-based navigation items and children rendering
// FR3: Role-based dashboard navigation
// FR17: Unified dashboard layout for all roles

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import DashboardFrame from "./DashboardFrame";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/dashboard/student",
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("DashboardFrame", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // FR3: STUDENT role renders expected nav items
  it('renders "Learning hub", "Browse courses", and "My courses" for STUDENT role (FR3)', () => {
    render(
      <DashboardFrame role="STUDENT">
        <div>student content</div>
      </DashboardFrame>
    );
    // Title appears in both mobile bar and desktop sidebar — use getAllByText
    expect(screen.getAllByText(/learning hub/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /browse courses/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /my courses/i }).length).toBeGreaterThan(0);
  });

  // FR3: TUTOR role renders expected nav items
  it('renders "Tutor workspace", "My courses", and "Submissions" for TUTOR role (FR3)', () => {
    render(
      <DashboardFrame role="TUTOR">
        <div>tutor content</div>
      </DashboardFrame>
    );
    // Title appears in both mobile bar and desktop sidebar — use getAllByText
    expect(screen.getAllByText(/tutor workspace/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /my courses/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /submissions/i })).toBeInTheDocument();
  });

  // FR3: ADMIN role renders "Administration" section title
  it('renders "Administration" section title for ADMIN role (FR3)', () => {
    render(
      <DashboardFrame role="ADMIN">
        <div>admin content</div>
      </DashboardFrame>
    );
    // Title appears in both mobile bar and desktop sidebar — use getAllByText
    expect(screen.getAllByText(/administration/i).length).toBeGreaterThan(0);
  });

  // FR17: Children are always rendered regardless of role
  it("always renders children content (FR17)", () => {
    render(
      <DashboardFrame role="STUDENT">
        <div data-testid="child-node">Hello children</div>
      </DashboardFrame>
    );
    expect(screen.getByTestId("child-node")).toBeInTheDocument();
  });

  // FR3: STUDENT role does not expose TUTOR-only nav items
  it("does not render tutor-only nav items for STUDENT role (FR3)", () => {
    render(
      <DashboardFrame role="STUDENT">
        <div>student content</div>
      </DashboardFrame>
    );
    expect(screen.queryByRole("link", { name: /submissions/i })).not.toBeInTheDocument();
  });

  // FR3: TUTOR role badge is shown as "Tutor"
  it('renders a "Tutor" role badge for TUTOR role (FR3)', () => {
    render(
      <DashboardFrame role="TUTOR">
        <div />
      </DashboardFrame>
    );
    expect(screen.getByText("Tutor")).toBeInTheDocument();
  });
});
