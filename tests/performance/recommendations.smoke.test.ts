// tests/performance/recommendations.smoke.test.ts
// Performance smoke tests for recommendation route response
// NFR11, FR15

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jwt", () => ({ verifyToken: vi.fn() }));
vi.mock("@/lib/gateways/recommendationGateway", () => ({
  getRecommendationsForStudent: vi.fn(),
}));

import { verifyToken } from "@/lib/jwt";
import * as gateway from "@/lib/gateways/recommendationGateway";
import { GET } from "@/app/api/recommendations/route";

const STUDENT = { sub: "perf-student-1", role: "STUDENT" };

function authReq(): Request {
  return new Request("http://localhost/api/recommendations", {
    headers: { Authorization: "Bearer token" },
  });
}

describe("GET /api/recommendations — performance smoke tests (NFR11, FR15)", () => {
  beforeEach(() => vi.clearAllMocks());

  // Smoke: route resolves with 200 and correct shape with mocked gateway
  it("responds with 200 and correct recommendations shape (FR15, NFR11)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT as any);
    vi.mocked(gateway.getRecommendationsForStudent).mockResolvedValue({
      recommendations: [
        { tutorId: "t1", score: 0.9 },
        { tutorId: "t2", score: 0.75 },
      ],
    });

    const res = await GET(authReq() as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("recommendations");
    expect(Array.isArray(body.recommendations)).toBe(true);
    expect(body.recommendations).toHaveLength(2);
  });

  // Smoke: gateway is called with the URL pattern matching /recommendations/:studentId
  it("gateway endpoint pattern includes studentId from JWT (NFR11)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT as any);
    vi.mocked(gateway.getRecommendationsForStudent).mockResolvedValue({
      recommendations: [],
    });

    await GET(authReq() as any);

    expect(gateway.getRecommendationsForStudent).toHaveBeenCalledWith(
      STUDENT.sub
    );
  });

  // Smoke: empty recommendations array is a valid response shape
  it("handles empty recommendations array without errors (FR15, NFR11)", async () => {
    vi.mocked(verifyToken).mockReturnValue(STUDENT as any);
    vi.mocked(gateway.getRecommendationsForStudent).mockResolvedValue({
      recommendations: [],
    });

    const res = await GET(authReq() as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.recommendations).toEqual([]);
  });
});
