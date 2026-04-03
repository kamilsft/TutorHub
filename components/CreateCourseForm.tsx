"use client";

// CreateCourseForm.tsx
// Lets a tutor create a new course
// FR5 (tutors create courses), NFR4 (client-side validation before submitting)

import React, { useState } from "react";
import { useRouter } from "next/navigation";

// tutorId prop is kept for backward compatibility but is no longer sent to the API
// the server reads the tutor identity from the JWT cookie (NFR2)
export default function CreateCourseForm({ tutorId: _tutorId }: { tutorId?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<string>("");
  const [level, setLevel] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // NFR4 — basic client-side check before hitting the server
    if (!title.trim() || !subject.trim()) {
      setError("Title and subject are required.");
      return;
    }

    setSaving(true);
    try {
      // FR5 — send only course data; tutorId is intentionally omitted
      // the server always derives the tutor identity from the JWT (NFR2)
      const payload: any = {
        title: title.trim(),
        subject: subject.trim(),
        description: description.trim() || null,
        level: level || null,
        price: price ? Number(price) : null,
        isPublished,
      };

      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to create course");
        return;
      }

      const createdTitle = (data?.title || title).toString().trim();
      setSuccess(`Course "${createdTitle}" created.`);
      setTitle("");
      setSubject("");
      setDescription("");
      setPrice("");
      setLevel("");
      setIsPublished(true);
      router.refresh();
    } catch (e) {
      setError("Failed to create course");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto p-4 bg-white rounded-lg shadow-sm space-y-4">
      {error && <div className="text-sm text-red-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Subject</label>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded px-3 py-2" rows={4} />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Level</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 cursor-pointer"
          >
            <option value="">Select level</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
            <option value="Expert">Expert</option>
          </select>
        </div>
        <div style={{ width: 140 }}>
          <label className="block text-sm font-medium mb-1">Price (USD)</label>
          <input value={price} onChange={(e) => setPrice(e.target.value)} className="w-full border rounded px-3 py-2" type="number" step="0.01" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input id="publish" type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
        <label htmlFor="publish" className="text-sm">Publish (visible to students)</label>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? "Saving…" : "Create course"}
        </button>
      </div>
    </form>
  );
}
