"use client";

// StudyPlanForm.tsx
// Used by students to create a new study plan (POST) or edit an existing one (PUT)
// Also used by tutors to edit a student's plan (PUT) — but only if the student is
// enrolled in one of the tutor's courses (enforced server-side via NFR2)
// FR12 (create), FR13 (update)

import { useEffect, useState } from "react";

type Task = { title: string; courseId: string; dueDate: string; completed?: boolean };
type Course = { id: string | number; title: string };

type StudyPlanFormProps = {
  // planId is set when editing an existing plan; absent for new plan creation
  planId?: number;
  // initialTasks pre-fills the form when editing
  initialTasks?: any[];
  // role is passed in so the form knows which API to call for the course list
  role?: "STUDENT" | "TUTOR";
};

export default function StudyPlanForm({ planId, initialTasks, role = "STUDENT" }: StudyPlanFormProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<Task[]>(
    (initialTasks ?? []).length > 0
      ? (initialTasks ?? []).map((t) => ({
        title: t.title,
        courseId: String(t.courseId),
        dueDate: new Date(t.dueDate).toISOString().slice(0, 10),
        completed: t.completed ?? false,
      }))
      : [{ title: "", courseId: "", dueDate: "", completed: false }]
  );

  const selectedCourseIds = tasks.map((t) => t.courseId);

  const [loading, setLoading] = useState(false);

  // FR12/FR13 — load the relevant course list
  // For new student plans: GET /api/courses/enrolled (student's enrolled courses)
  // For existing plans being edited: GET /api/study-plans/{id}/edit-data (handles both roles)
  useEffect(() => {
    async function loadCourses() {
      try {
        let url: string;

        if (planId) {
          // editing an existing plan — use the role-aware edit-data endpoint
          // this works for both students and tutors
          const res = await fetch(`/api/study-plans/${planId}/edit-data`);
          if (!res.ok) {
            console.error("Failed to load edit data:", await res.json());
            return;
          }
          const data = await res.json();
          if (Array.isArray(data.courses)) setCourses(data.courses);
          return;
        }

        // creating a new plan — students load their own enrolled courses
        url = "/api/courses/enrolled";
        const res = await fetch(url);
        const data = await res.json();
        if (Array.isArray(data)) setCourses(data);
        else setCourses([]);
      } catch (err) {
        console.error("Failed to load courses:", err);
        setCourses([]);
      }
    }
    loadCourses();
  }, [planId]);

  const handleTaskChange = (index: number, field: keyof Task, value: any) => {
    
    const updated = [...tasks];
    updated[index] = { ...updated[index], [field]: value };
    setTasks(updated);
  };

  const addTask = () => setTasks([...tasks, { title: "", courseId: "", dueDate: "" }]);
  const deleteTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const savePlan = async () => {
    // NFR4 — client-side check before hitting the server
    for (const t of tasks) {
      if (!t.title || !t.courseId || !t.dueDate) {
        alert("Please fill all fields for each task");
        return;
      }
    }

    setLoading(true);
    try {
      const method = planId ? "PUT" : "POST";

      // FR12 (POST) — studentId is NOT sent; server always uses the JWT
      // FR13 (PUT) — planId tells the server which plan to update
      const body = planId
        ? {
          planId,
          tasks: tasks.map((t) => ({
            title: t.title,
            courseId: t.courseId,
            dueDate: t.dueDate,
            completed: t.completed ?? false,
          })),
        }
        : {
          tasks: tasks.map((t) => ({
            title: t.title,
            courseId: t.courseId,
            dueDate: t.dueDate,
            completed: t.completed ?? false,
          })),
        };

      const res = await fetch("/api/study-plans", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to save");
        return;
      }

      alert(planId ? "Study plan updated!" : "Study plan created!");
      if (!planId) {
        setTasks([{ title: "", courseId: "", dueDate: "" }]);
      }
    } catch (err) {
      console.error(err);
      alert("Error saving study plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {tasks.map((t, i) => (
        <div key={i} className="mb-4 border p-2 rounded flex gap-2 items-center">

          
          <input
            placeholder="Task title"
            value={t.title}
            onChange={(e) => handleTaskChange(i, "title", e.target.value)}
            className="border rounded px-2 py-1 flex-1"
          />
          <select
            value={t.courseId}
            onChange={(e) => handleTaskChange(i, "courseId", e.target.value)}
            className="flex-1 appearance-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 pr-10 text-sm text-slate-900 shadow-sm transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 cursor-pointer"
          >
            <option value="">Select course</option>
            {courses.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.title}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={t.dueDate}
            onChange={(e) => handleTaskChange(i, "dueDate", e.target.value)}
            className="border rounded px-2 py-1 flex-1"
          />

          {/* Delete button to remove a task from the plan */}
          <button
            onClick={() => deleteTask(i)}
            className="bg-red-500 text-white px-2 py-1 rounded"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <button onClick={addTask} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
          + Add Task
        </button>
        <button
          onClick={savePlan}
          disabled={loading}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Saving…" : "Save Plan"}
        </button>
      </div>
    </div>
  );
}
