// app/api/recommendations/route.test.ts
// Unit tests for GET /api/recommendations
// FR15 (tutor recommendations), NFR1 (auth), NFR7 (interoperability), NFR8 (graceful degradation)

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jwt", () => ({ verifyToken: vi.fn() }));
vi.mock("@/lib/gateways/recommendationGateway", () => ({
  getRecommendationsForStudent: vi.fn(),
}));

import { verifyToken } from "@/lib/jwt";
import * as gateway from "@/lib/gateways/recommendationGateway";
import { GET } from "./route";

const STUDENT = { sub: "student-unit-1", role: "STUDENT" };

function req(token?: string): Request {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return new Request("http://localhost/api/recommendations", { headers });
}

describe("GET /api/recommendations", () => {
  beforeEach(() => vi.clearAllMocks());

  // NFR1: unauthenticated request must be rejected
  it("returns 401 when no valid token is provided (NFR1)", async () => {
    vi.mocked(verifyToken).mockReturnValue(null);
    const res = await GET(req() as any);
    expect(res.status).toBe(401);
  });

  // FR15: happy path — gateway resolves, route returns 200 with data
  it("returns 200 with recommendations data on success (FR15)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT as any);
    vi.mocked(gateway.getRecommendationsForStudent).mockResolvedValue({
      recommendations: [{ tutorId: "t1", score: 0.9 }],
    });

    const res = await GET(req("token") as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.recommendations).toHaveLength(1);
    expect(body.recommendations[0].tutorId).toBe("t1");
  });

  // NFR8: gateway throws a network error → 503 graceful degradation
  it("returns 503 when the recommendation service is unreachable (NFR8)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT as any);
    vi.mocked(gateway.getRecommendationsForStudent).mockRejectedValue(
      new Error("ECONNREFUSED")
    );

    const res = await GET(req("token") as any);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/unavailable/i);
  });

  // NFR7: downstream service returns an error with a status code → relayed faithfully
  it("relays downstream error status when gateway throws with status (NFR7)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT as any);
    vi.mocked(gateway.getRecommendationsForStudent).mockRejectedValue({
      status: 500,
      message: "Failed to fetch recommendations",
    });

    const res = await GET(req("token") as any);
    expect(res.status).toBe(500);
  });

  // NFR2: student ID must come from the JWT, never from external input
  it("calls gateway with the studentId from JWT — never from query string (NFR2)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT as any);
    vi.mocked(gateway.getRecommendationsForStudent).mockResolvedValue({
      recommendations: [],
    });

    // Query string has a different id — it must be ignored
    const requestWithQueryId = new Request(
      "http://localhost/api/recommendations?studentId=injected-id",
      { headers: { Authorization: "Bearer token" } }
    );
    await GET(requestWithQueryId as any);

    expect(gateway.getRecommendationsForStudent).toHaveBeenCalledWith("student-unit-1");
    expect(gateway.getRecommendationsForStudent).not.toHaveBeenCalledWith("injected-id");
  });
});
