// components/StudyPlanCard.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import deleteStudyPlanButton from "./DeleteStudyPlan";
import DeleteStudyPlanButton from "./DeleteStudyPlan";

type Task = {
  id: number;
  title: string;
  courseId: string;
  dueDate: string;
  completed: boolean;
};

type StudyPlanCardProps = {
  planId: number;
  studentName: string;
  createdAt: string;
  tasks: Task[];
  showActions?: boolean;
};

export default function StudyPlanCard({ planId, studentName, createdAt, tasks: initialTasks }: StudyPlanCardProps) {
  const [tasks, setTasks] = useState(initialTasks);

  const getProgressPercent = (tasks: Task[]) => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.completed).length;
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  };

  const progressPercent = getProgressPercent(tasks);

  const handleToggle = async (taskId: number, completed: boolean) => {
    try {
      // Call your API to update the task
      await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });

      // Update local state
      setTasks(tasks.map(t => t.id === taskId ? { ...t, completed } : t));
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };

  return (
    // <div className={`group flex flex-col rounded-2xl border p-6 shadow-md transition ${progressPercent === 100 ? "bg-gray-100 opacity-70" : "bg-white"}`}>
    //   <div className="flex justify-between items-center mb-3">
    //     <div>
    //       <h2 className="text-lg font-semibold text-slate-900">{studentName}'s Plan</h2>
    //       <p className="text-sm text-slate-500">Created on {new Date(createdAt).toLocaleDateString()}</p>
    //     </div>
    //     <Link
    //       href={`/dashboard/tutor/study-plan/${planId}/edit`}
    //       className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-emerald-500"
    //     >
    //       Edit →
    //     </Link>

    //     <DeleteStudyPlanButton planId={planId} />
    //     <div>

    //     </div>

    //   </div>


    <div
  className={`group flex flex-col rounded-2xl border p-6 shadow-md transition ${
    progressPercent === 100 ? "bg-gray-100 opacity-70" : "bg-white"
  }`}
>
  {/* Header */}
  <div className="flex justify-between items-start mb-4">
    
    {/* Left: Title + date */}
    <div>
      <h2 className="text-lg font-semibold text-slate-900">
        {studentName}'s Plan
      </h2>
      <p className="text-sm text-slate-500">
        Created on {new Date(createdAt).toLocaleDateString()}
      </p>
    </div>

    {/* Right: Actions */}
    <div className="flex items-center gap-2">
      
      {/* Edit Button */}
      <Link
        href={`/dashboard/student/study-plan/${planId}/edit`}
        className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-emerald-500 transition"
      >
        Edit
      </Link>

      {/* Delete Button */}
      <DeleteStudyPlanButton planId={planId} />
      
    </div>
  </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-emerald-500 h-4 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <p className="text-sm text-slate-600 mt-1">{progressPercent}% completed</p>
      </div>

      {/* Tasks */}
      <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={t.completed}
              onChange={(e) => handleToggle(t.id, e.target.checked)}
            />
            <span className={t.completed ? "line-through text-gray-400" : ""}>
              {t.title} — {t.courseId} — due {new Date(t.dueDate).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}