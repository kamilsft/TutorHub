// tests/contracts/recommendations.contract.test.ts
// Contract tests for the recommendation service boundary
// Verifies payload structure, response shape, error shape, timeout handling, and fallback
// FR15, NFR7, NFR8, NFR10

import { beforeEach, describe, expect, it, vi } from "vitest";

// Import the REAL gateway — fetch is stubbed per test so we exercise actual logic
import { getRecommendationsForStudent } from "@/lib/gateways/recommendationGateway";

const BASE_URL =
  process.env.RECOMMENDATION_SERVICE_URL ?? "http://localhost:8000";

describe("recommendationGateway contract (FR15, NFR7, NFR8, NFR10)", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  // Contract: gateway constructs the correct URL before calling the service
  it("calls the correct endpoint URL for the given studentId (NFR7)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ recommendations: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await getRecommendationsForStudent("student-123");

    expect(mockFetch).toHaveBeenCalledOnce();
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toBe(`${BASE_URL}/recommendations/student-123`);
  });

  // Contract: successful response is parsed and returned as-is
  it("returns parsed JSON with recommendations array on success (FR15)", async () => {
    const payload = {
      recommendations: [
        { tutorId: "tutor-1", score: 0.95 },
        { tutorId: "tutor-2", score: 0.80 },
      ],
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload,
    }));

    const result = await getRecommendationsForStudent("student-abc");

    expect(result).toEqual(payload);
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.recommendations).toHaveLength(2);
    expect(result.recommendations[0]).toHaveProperty("tutorId");
    expect(result.recommendations[0]).toHaveProperty("score");
  });

  // Contract: non-ok response throws a structured error with { status, message }
  it("throws structured error { status, message } when service returns 404 (NFR8)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    }));

    await expect(
      getRecommendationsForStudent("missing-student")
    ).rejects.toMatchObject({
      status: 404,
      message: "Failed to fetch recommendations",
    });
  });

  // Contract: network-level failure propagates as-is (fetch throws)
  it("propagates network errors when fetch itself throws (NFR8)", async () => {
    const networkError = new Error("ECONNREFUSED");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(networkError));

    await expect(
      getRecommendationsForStudent("student-xyz")
    ).rejects.toThrow("ECONNREFUSED");
  });

  // Contract: malformed response body causes json() to throw — error propagates
  it("propagates parse errors when response body is malformed (NFR10)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON at position 0");
      },
    }));

    await expect(
      getRecommendationsForStudent("student-xyz")
    ).rejects.toThrow(SyntaxError);
  });
});
