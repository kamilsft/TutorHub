"use client";

// EditCourseForm.tsx
// FR5 — lets a tutor edit course details and toggle publish/archive

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CourseData = {
  id: number;
  title: string;
  subject: string;
  description: string | null;
  price: number | null;
  level: string | null;
  isPublished: boolean;
};

export default function EditCourseForm({ courseId }: { courseId: number }) {
  const router = useRouter();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [level, setLevel] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadCourse() {
      try {
        const res = await fetch(`/api/courses/mine`);
        if (!res.ok) {
          setError("Failed to load course");
          setLoading(false);
          return;
        }
        const courses = await res.json();
        const found = Array.isArray(courses)
          ? courses.find((c: any) => c.id === courseId)
          : null;

        if (!found) {
          setError("Course not found or you don't own it");
          setLoading(false);
          return;
        }

        const detailRes = await fetch(`/api/courses?subject=`);
        const allCourses = await detailRes.json();
        const full = Array.isArray(allCourses)
          ? allCourses.find((c: any) => c.id === courseId)
          : null;

        const merged = { ...found, ...full };
        setCourse(merged);
        setTitle(merged.title || "");
        setSubject(merged.subject || "");
        setDescription(merged.description || "");
        setPrice(merged.price != null ? String(merged.price) : "");
        setLevel(merged.level || "");
        setIsPublished(merged.isPublished ?? true);
      } catch {
        setError("Failed to load course");
      } finally {
        setLoading(false);
      }
    }
    loadCourse();
  }, [courseId]);

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
      const res = await fetch(`/api/courses?id=${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subject: subject.trim(),
          description: description.trim() || null,
          level: level || null,
          price: price ? Number(price) : null,
          isPublished,
        }),
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

  async function handleTogglePublish() {
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/courses?id=${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !isPublished }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to update visibility");
        return;
      }
      setIsPublished(!isPublished);
      setSuccess(isPublished ? "Course archived." : "Course published.");
      router.refresh();
    } catch {
      setError("Failed to update visibility");
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
      "Delete this archived course permanently? This will also remove its assignments, enrollments, and submissions."
    );
    if (!confirmed) return;

    setError(null);
    setSuccess(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/courses?id=${courseId}`, {
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

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200/90 bg-white p-8 shadow-md shadow-slate-200/30">
        <p className="text-center text-sm text-slate-400">Loading course...</p>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-red-100 bg-white p-8 shadow-md">
        <p className="text-center text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Status banner */}
      <div className={`mb-6 flex items-center justify-between rounded-2xl border p-4 ${
        isPublished
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-amber-200 bg-amber-50/60"
      }`}>
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${
            isPublished ? "bg-emerald-500" : "bg-amber-500"
          }`} />
          <span className="text-sm font-medium text-slate-700">
            {isPublished ? "This course is visible to students" : "This course is hidden (draft)"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTogglePublish}
            disabled={saving || deleting}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition disabled:opacity-50 ${
              isPublished
                ? "border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                : "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500"
            }`}
          >
            {isPublished ? "Archive course" : "Publish course"}
          </button>
          {!isPublished && (
            <button
              onClick={handleDelete}
              disabled={saving || deleting}
              className="rounded-xl border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete course"}
            </button>
          )}
        </div>
      </div>

      {/* Form card */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/30 sm:p-8"
      >
        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="e.g. Introduction to Operating Systems"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Subject</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="e.g. Computer Science"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="What will students learn in this course?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Select level</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Price (USD)</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                type="number"
                step="0.01"
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
          <button
            type="button"
            onClick={() => router.push("/dashboard/tutor/courses")}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            &larr; Back to courses
          </button>
          <button
            type="submit"
            disabled={saving || deleting}
            className="inline-flex items-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
