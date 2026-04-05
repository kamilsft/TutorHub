// tests/integration/recommendations.integration.test.ts
// Integration tests for GET /api/recommendations
// FR15 (recommendations), NFR1 (auth), NFR8 (graceful degradation)
// recommendationGateway is mocked — we test only the route's HTTP wiring

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jwt", () => ({ verifyToken: vi.fn() }));
vi.mock("@/lib/gateways/recommendationGateway", () => ({
  getRecommendationsForStudent: vi.fn(),
}));

import { verifyToken } from "@/lib/jwt";
import * as recommendationGateway from "@/lib/gateways/recommendationGateway";
import { GET } from "@/app/api/recommendations/route";

const STUDENT = { sub: "student-1", role: "STUDENT" };

function req(payload?: typeof STUDENT): Request {
  const headers: Record<string, string> = {};
  if (payload) headers["Authorization"] = "Bearer token";
  return new Request("http://localhost/api/recommendations", { headers });
}

describe("GET /api/recommendations (FR15 + NFR1)", () => {
  beforeEach(() => vi.clearAllMocks());

  // NFR1: no valid token → 401
  it("returns 401 with no token (NFR1)", async () => {
    vi.mocked(verifyToken).mockReturnValue(null);
    const res = await GET(req() as any);
    expect(res.status).toBe(401);
  });

  // NFR2: gateway is called with studentId from JWT — never from query params
  it("calls gateway with student ID from JWT — never from query (NFR2)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT as any);
    vi.mocked(recommendationGateway.getRecommendationsForStudent).mockResolvedValue({ recommendations: [] });

    await GET(req(STUDENT) as any);

    expect(recommendationGateway.getRecommendationsForStudent)
      .toHaveBeenCalledWith("student-1");
  });

  // FR15 happy path: gateway resolves → route returns 200 with data
  it("returns 200 with recommendation data on success (FR15)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT as any);
    vi.mocked(recommendationGateway.getRecommendationsForStudent)
      .mockResolvedValue({ recommendations: [{ tutorId: "t1" }] });

    const res = await GET(req(STUDENT) as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.recommendations).toHaveLength(1);
  });

  // NFR8: gateway throws network error → 503 graceful degradation
  it("returns 503 when the recommendation service is unreachable (NFR8)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT as any);
    vi.mocked(recommendationGateway.getRecommendationsForStudent)
      .mockRejectedValue(new Error("ECONNREFUSED"));

    const res = await GET(req(STUDENT) as any);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain("unavailable");
  });

  // NFR8: gateway throws structured error with status (e.g. downstream 500) → relayed
  it("relays downstream error status when gateway throws with status (NFR8)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT as any);
    vi.mocked(recommendationGateway.getRecommendationsForStudent)
      .mockRejectedValue({ status: 500, message: "Failed to fetch recommendations" });

    const res = await GET(req(STUDENT) as any);
    expect(res.status).toBe(500);
  });

  // NFR8: gateway resolves with malformed shape (no recommendations key) → route does not crash
  it("returns 200 without crashing when gateway returns a malformed response (NFR8)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT as any);
    vi.mocked(recommendationGateway.getRecommendationsForStudent)
      .mockResolvedValue({ data: [] } as any); // wrong key — missing "recommendations"

    const res = await GET(req(STUDENT) as any);
    expect(res.status).toBe(200); // route must not throw
  });

  // NFR8: gateway throws an error with no status field → falls back to 503
  it("falls back to 503 when gateway throws an error with no status field (NFR8)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT as any);
    vi.mocked(recommendationGateway.getRecommendationsForStudent)
      .mockRejectedValue({ message: "Unknown failure" }); // no status field

    const res = await GET(req(STUDENT) as any);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain("unavailable");
  });

});
