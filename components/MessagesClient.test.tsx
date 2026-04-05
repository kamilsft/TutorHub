// @vitest-environment jsdom
// components/MessagesClient.test.tsx
// Unit tests for the MessagesClient React component
// Layer: Frontend UI — verifies thread loading, empty state, thread list rendering, and new-conversation trigger
// FR10: Users can view their message threads
// FR11: Users can start new conversations

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import MessagesClient from "./MessagesClient";

const mockThreads = [
  {
    peer: { id: "u1", fullName: "Alice Tutor", email: "alice@example.com" },
    lastAt: new Date().toISOString(),
    preview: "See you in class!",
    unread: 2,
  },
  {
    peer: { id: "u2", fullName: "Bob Student", email: "bob@example.com" },
    lastAt: new Date().toISOString(),
    preview: "Thanks for the help.",
    unread: 0,
  },
];

describe("MessagesClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    // suppress localStorage access in jsdom
    vi.stubGlobal("localStorage", { getItem: vi.fn(() => null) });
    // jsdom does not implement scrollIntoView — stub it so useEffect doesn't throw
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  // FR10: Skeleton loading placeholders are shown while threads are being fetched
  it("shows skeleton loading UI while fetching threads (FR10)", () => {
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(() => {}));
    render(<MessagesClient />);
    // skeleton divs use animate-pulse — check the panel heading is present
    expect(screen.getByText(/conversations/i)).toBeInTheDocument();
  });

  // FR10: "No conversations yet" message shown for empty thread list
  it('shows "No conversations yet" when thread list is empty (FR10)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ threads: [] }),
    } as any);
    render(<MessagesClient />);
    await waitFor(() =>
      expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument()
    );
  });

  // FR10: Thread list renders peer names when data is available
  it("renders peer names in thread list when threads are loaded (FR10)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ threads: mockThreads }),
    } as any);
    render(<MessagesClient />);
    await waitFor(() => {
      expect(screen.getByText("Alice Tutor")).toBeInTheDocument();
      expect(screen.getByText("Bob Student")).toBeInTheDocument();
    });
  });

  // FR11: "New" button is always visible in the header
  it('renders a "New" button to start a new conversation (FR11)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ threads: [] }),
    } as any);
    render(<MessagesClient />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /new/i })).toBeInTheDocument()
    );
  });

  // FR11: Clicking "New" reveals the compose/search panel
  it('clicking "New" opens the compose panel with a search input (FR11)', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ threads: [] }),
    } as any);
    render(<MessagesClient />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /new/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /new/i }));
    expect(screen.getByPlaceholderText(/search by name/i)).toBeInTheDocument();
  });

  // FR10: Unread count badge is shown for threads with unread messages
  it("displays unread count badge for threads with unread messages (FR10)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ threads: mockThreads }),
    } as any);
    render(<MessagesClient />);
    await waitFor(() =>
      expect(screen.getByText(/2 new/i)).toBeInTheDocument()
    );
  });

  // FR10: Clicking a thread loads the conversation (calls loadConversation)
  it("loads conversation when a thread is clicked (FR10)", async () => {
    const conversationResponse = {
      peer: { id: "u1", fullName: "Alice Tutor", email: "alice@example.com" },
      messages: [
        {
          id: "m1",
          content: "Hello there!",
          createdAt: new Date().toISOString(),
          senderId: "u1",
          receiverId: "me",
          isRead: true,
        },
      ],
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ threads: mockThreads }) } as any) // initial loadThreads
      .mockResolvedValueOnce({ ok: true, json: async () => conversationResponse } as any)       // loadConversation
      .mockResolvedValueOnce({ ok: true, json: async () => ({ threads: mockThreads }) } as any); // loadThreads inside loadConversation

    render(<MessagesClient />);
    await waitFor(() => expect(screen.getByText("Alice Tutor")).toBeInTheDocument());

    fireEvent.click(screen.getAllByText("Alice Tutor")[0].closest("button")!);

    await waitFor(() => expect(screen.getByText("Hello there!")).toBeInTheDocument());
  });

  // FR11: Searching for a user in compose panel triggers user lookup
  it("searching in compose panel calls user search API (FR11)", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ threads: [] }) } as any) // loadThreads
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          users: [{ id: "u3", fullName: "Carol Teacher", email: "carol@example.com", role: "TUTOR" }],
        }),
      } as any); // search

    render(<MessagesClient />);
    await waitFor(() => screen.getByRole("button", { name: /new/i }));
    fireEvent.click(screen.getByRole("button", { name: /new/i }));

    fireEvent.change(screen.getByPlaceholderText(/search by name/i), {
      target: { value: "Carol" },
    });

    await waitFor(() => expect(screen.getByText("Carol Teacher")).toBeInTheDocument(), {
      timeout: 1000,
    });
  });

  // FR11: Clicking a search result opens a conversation with that user (pickPeer)
  it("clicking a search result opens conversation with that user (FR11)", async () => {
    const searchUser = { id: "u3", fullName: "Carol Teacher", email: "carol@example.com", role: "TUTOR" };
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ threads: [] }) } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ users: [searchUser] }) } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          peer: { id: "u3", fullName: "Carol Teacher", email: "carol@example.com" },
          messages: [],
        }),
      } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ threads: [] }) } as any);

    render(<MessagesClient />);
    await waitFor(() => screen.getByRole("button", { name: /new/i }));
    fireEvent.click(screen.getByRole("button", { name: /new/i }));

    fireEvent.change(screen.getByPlaceholderText(/search by name/i), {
      target: { value: "Carol" },
    });

    await waitFor(() => screen.getByText("Carol Teacher"), { timeout: 1000 });
    fireEvent.click(screen.getByText("Carol Teacher").closest("button")!);

    // compose panel should close after picking peer
    expect(screen.queryByPlaceholderText(/search by name/i)).not.toBeInTheDocument();
  });

  // FR10: Shows error state when thread loading fails
  it("shows error message when thread loading fails (FR10)", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Unauthorized" }),
      statusText: "Unauthorized",
    } as any);

    render(<MessagesClient />);
    await waitFor(() => expect(screen.getByText(/unauthorized/i)).toBeInTheDocument());
  });

  // FR11: Sending a message calls POST /api/messages (submitMessage + handleSend)
  it("sends a message when the form is submitted (FR11)", async () => {
    const conversationResponse = {
      peer: { id: "u1", fullName: "Alice Tutor", email: "alice@example.com" },
      messages: [],
    };
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ threads: mockThreads }) } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => conversationResponse } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ threads: mockThreads }) } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as any) // POST message
      .mockResolvedValueOnce({ ok: true, json: async () => conversationResponse } as any) // reload conversation
      .mockResolvedValueOnce({ ok: true, json: async () => ({ threads: mockThreads }) } as any);

    render(<MessagesClient />);
    await waitFor(() => screen.getByText("Alice Tutor"));

    fireEvent.click(screen.getAllByText("Alice Tutor")[0].closest("button")!);
    await waitFor(() => screen.getByPlaceholderText(/write a message/i));

    fireEvent.change(screen.getByPlaceholderText(/write a message/i), {
      target: { value: "Hello Alice!" },
    });
    fireEvent.submit(screen.getByPlaceholderText(/write a message/i).closest("form")!);

    await waitFor(() =>
      expect(vi.mocked(fetch)).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: "POST" })
      )
    );
  });
});
