"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Task = {
  title: string;
  courseId: string;
  dueDate: string;
  completed: boolean;
};

type Course = {
  id: string;
  title: string;
};

type StudyPlanFormProps = {
  initialTasks?: Array<{
    title: string;
    courseId: string | number;
    dueDate: string | Date;
    completed?: boolean;
  }>;
  planId?: number;
  availableCourses?: Course[];
  onSavedPath?: string;
  saveButtonLabel?: string;
};

const EMPTY_TASK: Task = {
  title: "",
  courseId: "",
  dueDate: "",
  completed: false,
};

function toDateInputValue(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default function StudyPlanForm({
  initialTasks,
  planId,
  availableCourses,
  onSavedPath,
  saveButtonLabel,
}: StudyPlanFormProps) {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>(availableCourses ?? []);
  const [tasks, setTasks] = useState<Task[]>(() => {
    if (!initialTasks || initialTasks.length === 0) return [{ ...EMPTY_TASK }];
    return initialTasks.map((task) => ({
      title: task.title,
      courseId: String(task.courseId),
      dueDate: toDateInputValue(task.dueDate),
      completed: !!task.completed,
    }));
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mergedCourses = useMemo(() => {
    const map = new Map<string, string>();
    for (const course of courses) {
      map.set(String(course.id), course.title);
    }

    // Keep course ids referenced in loaded tasks selectable even if not in fetched list.
    for (const task of tasks) {
      if (task.courseId && !map.has(task.courseId)) {
        map.set(task.courseId, `Course #${task.courseId}`);
      }
    }

    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [courses, tasks]);

  useEffect(() => {
    if (availableCourses && availableCourses.length > 0) {
      setCourses(availableCourses);
      return;
    }

    async function loadCourses() {
      try {
        const res = await fetch("/api/courses/enrolled");
        const data = await res.json().catch(() => []);
        if (!res.ok || !Array.isArray(data)) {
          setCourses([]);
          return;
        }

        setCourses(
          data.map((course: any) => ({
            id: String(course.id),
            title: String(course.title || `Course #${course.id}`),
          }))
        );
      } catch (err) {
        console.error("Failed to load enrolled courses:", err);
        setCourses([]);
      }
    }

    loadCourses();
  }, [availableCourses]);

  function handleTaskChange(index: number, patch: Partial<Task>) {
    setTasks((prev) =>
      prev.map((task, i) => (i === index ? { ...task, ...patch } : task))
    );
  }

  function addTask() {
    setTasks((prev) => [...prev, { ...EMPTY_TASK }]);
  }

  function removeTask(index: number) {
    setTasks((prev) => {
      if (prev.length <= 1) return [{ ...EMPTY_TASK }];
      return prev.filter((_, i) => i !== index);
    });
  }

  async function savePlan() {
    setError(null);
    setSuccess(null);

    if (tasks.length === 0) {
      setError("Add at least one task.");
      return;
    }

    for (const task of tasks) {
      if (!task.title.trim() || !task.courseId || !task.dueDate) {
        setError("Please complete title, course, and due date for every task.");
        return;
      }
    }

    setSaving(true);
    try {
      const method = planId ? "PUT" : "POST";
      const body = planId
        ? {
            planId,
            tasks: tasks.map((task) => ({
              title: task.title.trim(),
              courseId: task.courseId,
              dueDate: task.dueDate,
              completed: !!task.completed,
            })),
          }
        : {
            tasks: tasks.map((task) => ({
              title: task.title.trim(),
              courseId: task.courseId,
              dueDate: task.dueDate,
              completed: !!task.completed,
            })),
          };

      const res = await fetch("/api/study-plans", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to save study plan");
        return;
      }

      if (onSavedPath) {
        router.push(onSavedPath);
        return;
      }

      setSuccess(planId ? "Study plan updated." : "Study plan created.");
      if (planId) router.refresh();
      else setTasks([{ ...EMPTY_TASK }]);
    } catch (err) {
      console.error(err);
      setError("Error saving study plan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>
      )}

      {tasks.map((task, index) => (
        <div key={index} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
          <input
            placeholder="Task title"
            value={task.title}
            onChange={(e) => handleTaskChange(index, { title: e.target.value })}
            className="w-full rounded border px-2 py-1"
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={task.courseId}
              onChange={(e) => handleTaskChange(index, { courseId: e.target.value })}
              className="w-full rounded border bg-white px-2 py-1"
            >
              <option value="">Select course</option>
              {mergedCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={task.dueDate}
              onChange={(e) => handleTaskChange(index, { dueDate: e.target.value })}
              className="w-full rounded border px-2 py-1"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={(e) => handleTaskChange(index, { completed: e.target.checked })}
              />
              Completed
            </label>

            <button
              type="button"
              onClick={() => removeTask(index)}
              className="rounded border border-red-200 px-2 py-1 text-sm text-red-600 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={addTask}
          className="rounded bg-sky-600 px-3 py-2 text-white hover:bg-sky-500"
        >
          Add task
        </button>
        <button
          type="button"
          onClick={savePlan}
          disabled={saving}
          className="rounded bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {saving
            ? "Saving..."
            : saveButtonLabel || (planId ? "Update plan" : "Save plan")}
        </button>
      </div>
    </div>
  );
}
