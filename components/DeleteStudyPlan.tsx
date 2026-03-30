"use client";
import { useRouter } from "next/navigation";

type DeleteStudyPlanButtonProps = {
  planId: number;
};

export default function DeleteStudyPlanButton({ planId }: DeleteStudyPlanButtonProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this study plan?")) return;

    try {
      const res = await fetch(`/api/study-plans/${planId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        alert("Failed to delete study plan");
        return;
      }

      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Error deleting study plan");
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-500"
    >
      Delete
    </button>
  );
}