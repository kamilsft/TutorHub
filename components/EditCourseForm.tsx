"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type EditableCourse = {
  id: number;
  title: string;
  subject: string;
  description?: string | null;
  price?: number | null;
  level?: string | null;
  isPublished: boolean;
};

export default function EditCourseForm({ course }: { course: EditableCourse }) {
  const router = useRouter();
  const [title, setTitle] = useState(course.title);
  const [subject, setSubject] = useState(course.subject);
  const [description, setDescription] = useState(course.description || "");
  const [price, setPrice] = useState(
    typeof course.price === "number" ? course.price.toString() : ""
  );
  const [level, setLevel] = useState(course.level || "");
  const [isPublished, setIsPublished] = useState(!!course.isPublished);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title.trim() || !subject.trim()) {
      setError("Title and subject are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        subject: subject.trim(),
        description: description.trim() || null,
        level: level || null,
        price: price ? Number(price) : null,
        isPublished,
      };

      const res = await fetch(`/api/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to update course");
        return;
      }

      setSuccess("Course updated successfully.");
      router.refresh();
    } catch {
      setError("Failed to update course");
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish(nextPublished: boolean) {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: nextPublished }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Failed to ${nextPublished ? "publish" : "archive"} course`);
        return;
      }

      setIsPublished(nextPublished);
      setSuccess(`Course ${nextPublished ? "published" : "archived"} successfully.`);
      router.refresh();
    } catch {
      setError(`Failed to ${nextPublished ? "publish" : "archive"} course`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (isPublished) {
      setError("Archive the course before deleting it.");
      return;
    }

    const confirmed = window.confirm(
      "Delete this archived course permanently? This will also remove its assignments, enrollments, progress, tasks, and submissions."
    );
    if (!confirmed) return;

    setError(null);
    setSuccess(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/courses/${course.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to delete course");
        return;
      }

      router.push("/dashboard/tutor/courses");
      router.refresh();
    } catch {
      setError("Failed to delete course");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl rounded-lg bg-white p-4 shadow-sm space-y-4">
      {error && <div className="text-sm text-red-600">{error}</div>}
      {success && <div className="text-sm text-emerald-600">{success}</div>}

      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded border px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded border px-3 py-2"
          rows={4}
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium">Level</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-full rounded border bg-white px-3 py-2"
          >
            <option value="">Select level</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
            <option value="Expert">Expert</option>
          </select>
        </div>
        <div style={{ width: 140 }}>
          <label className="mb-1 block text-sm font-medium">Price (USD)</label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded border px-3 py-2"
            type="number"
            min="0"
            step="0.01"
          />
        </div>
      </div>
      
      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleTogglePublish(!isPublished)}
            disabled={saving || deleting}
            className="rounded border border-amber-300 px-4 py-2 text-amber-700 disabled:opacity-60"
          >
            {isPublished ? "Archive course" : "Publish course"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || deleting || isPublished}
            className="rounded border border-red-300 px-4 py-2 text-red-700 disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete course"}
          </button>
        </div>
        <button
          type="submit"
          disabled={saving || deleting}
          className="rounded bg-emerald-600 px-4 py-2 text-white"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}
