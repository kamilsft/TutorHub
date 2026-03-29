"use client";

import React from "react";

type Tutor = { id: string; fullName: string; avatar?: string | null };

export type Course = {
  id: number;
  title: string;
  subject: string;
  description?: string | null;
  price?: number | null;
  level?: string | null;
  averageRating?: number | null;
  tutor: Tutor;
};

export default function EnrolledCourseList({ courses }: { courses: Course[] }) {
  if (courses.length === 0) return <p>No enrolled courses found.</p>;

  return (
    <ul className="space-y-4">
      {courses.map((course) => (
        <li key={course.id} className="p-4 border rounded-lg bg-white shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{course.title}</h3>
                <span className="text-sm text-gray-600">{course.level || "Any level"}</span>
              </div>
              <p className="text-sm text-gray-700 mt-1">
                {course.description ? course.description.slice(0, 180) : "No description"}
              </p>
              <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                <span className="font-medium">{course.subject}</span>
                <span>•</span>
                <span>{course.tutor?.fullName || "Unknown tutor"}</span>
                {typeof course.price === "number" && <><span>•</span><span>${course.price.toFixed(2)}</span></>}
                {typeof course.averageRating === "number" && <><span>•</span><span>⭐ {course.averageRating}</span></>}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}