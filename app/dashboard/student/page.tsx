"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Recommendation {
  tutorId: string;
  tutorName: string;
  courseId: number;
  courseTitle: string;
  courseSubject: string;
  courseLevel: string | null;
  coursePrice: number | null;
  averageRating: number | null;
  totalStudents: number;
}

function RecommendedTutorsSection() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        // The API route reads the authToken cookie itself on the server side
        // so we don't need to pass studentId from the client at all
        const res = await fetch("/api/recommendations", {
          credentials: "include", // ensures the authToken cookie is sent
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load recommendations");
          return;
        }

        const recs = Array.isArray(data?.recommendations) ? data.recommendations : [];
        setRecommendations(recs);
        if (recs.length === 0) {
          setEmptyMessage(
            typeof data?.message === "string"
              ? data.message
              : "No recommendations available right now."
          );
        } else {
          setEmptyMessage(null);
        }
      } catch {
        setError("Recommendation service unavailable");
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <div className="col-span-full rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/30">
        <h2 className="text-lg font-semibold text-slate-900">Recommended Tutors</h2>
        <p className="mt-2 text-sm text-slate-400">Loading recommendations...</p>
      </div>
    );
  }

  if (error || recommendations.length === 0) {
    return (
      <div className="col-span-full rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/30">
        <h2 className="text-lg font-semibold text-slate-900">Recommended Tutors</h2>
        <p className="mt-2 text-sm text-slate-400">
          {error ?? emptyMessage ?? "No recommendations yet. Enroll in a course to get started."}
        </p>
      </div>
    );
  }

  return (
    <div className="col-span-full rounded-2xl border border-emerald-100 bg-white p-6 shadow-md shadow-slate-200/30">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Recommended Tutors</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recommendations.map((rec) => (
          <div
            key={rec.courseId}
            className="group flex flex-col rounded-xl border border-slate-200/90 bg-slate-50 p-4 transition hover:border-emerald-200/80 hover:shadow-md hover:shadow-emerald-100/40"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
              {rec.courseSubject}
            </p>
            <h3 className="mt-1 font-semibold text-slate-900">{rec.tutorName}</h3>
            <p className="mt-0.5 text-sm text-slate-600">{rec.courseTitle}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              {rec.courseLevel && <span>📚 {rec.courseLevel}</span>}
              {rec.averageRating != null && <span>⭐ {rec.averageRating}</span>}
              <span>👥 {rec.totalStudents} students</span>
              {rec.coursePrice != null && (
                <span className="font-medium text-emerald-700">${rec.coursePrice}</span>
              )}
            </div>
            <Link
              href={`/courses/${rec.courseId}`}
              className="mt-4 inline-flex w-fit items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500"
            >
              View course
              <span className="ml-1 transition group-hover:translate-x-0.5" aria-hidden>→</span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  const cards = [
    {
      title: "Browse courses",
      description: "Discover published courses, read descriptions, and enroll when you're ready.",
      href: "/courses",
      cta: "Open catalog",
    },
    {
      title: "My assignments",
      description: "View due dates, submit work, and track feedback from your tutors.",
      href: "/dashboard/student/assignments",
      cta: "View assignments",
    },
    {
      title: "Progress",
      description:
        "Structured materials and submissions help you stay on track — more insights coming soon.",
      href: "/dashboard/student",
      cta: "Overview",
      muted: true,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-8 shadow-lg shadow-slate-200/40 sm:p-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
          Student workspace
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Welcome to your learning hub
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          TutorHub connects you with structured courses, tutor support, and a clear place for
          assignments — aligned with your team&apos;s tutoring platform vision.
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="group flex flex-col rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/30 transition hover:border-emerald-200/80 hover:shadow-lg hover:shadow-emerald-100/40"
          >
            <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{card.description}</p>
            {card.muted ? (
              <span className="mt-6 inline-flex text-sm font-medium text-slate-400">
                {card.cta}
              </span>
            ) : (
              <Link
                href={card.href}
                className="mt-6 inline-flex w-fit items-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500"
              >
                {card.cta}
                <span className="ml-1 transition group-hover:translate-x-0.5" aria-hidden>
                  →
                </span>
              </Link>
            )}
          </div>
        ))}

        <div className="group flex flex-col rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/30 transition hover:border-emerald-200/80 hover:shadow-lg hover:shadow-emerald-100/40">
          <h2 className="text-lg font-semibold text-slate-900">Create Study Plan</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
            Add a new study plan with tasks for your enrolled courses.
          </p>
          <Link
            href="/dashboard/student/study-plan/create-plan"
            className="mt-6 inline-flex w-fit items-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500"
          >
            Create a study plan
            <span className="ml-1 transition group-hover:translate-x-0.5" aria-hidden>
              →
            </span>
          </Link>
        </div>

        <div className="group flex flex-col rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/30 transition hover:border-emerald-200/80 hover:shadow-lg hover:shadow-emerald-100/40">
          <h2 className="text-lg font-semibold text-slate-900">View Study Plans</h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
            See all your saved study plans and tasks.
          </p>
          <Link
            href="/dashboard/student/study-plan/view-plans"
            className="mt-6 inline-flex w-fit items-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500"
          >
            View Study Plans
            <span className="ml-1 transition group-hover:translate-x-0.5" aria-hidden>
              →
            </span>
          </Link>
        </div>

        {/* Recommended Tutors — spans full width below the other cards */}
        <RecommendedTutorsSection />
      </div>
    </div>
  );
}
