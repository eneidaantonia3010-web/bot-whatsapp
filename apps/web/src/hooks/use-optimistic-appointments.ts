"use client";

import { useOptimistic, useTransition } from "react";
import type { Appointment } from "@/types";
import { updateAppointment } from "@/lib/api";

type OptimisticAction =
  | { type: "UPDATE_STATUS"; id: string; status: Appointment["status"] }
  | { type: "ADD_APPOINTMENT"; appointment: Appointment }
  | { type: "DELETE_APPOINTMENT"; id: string };

export function useOptimisticAppointments(initialAppointments: Appointment[]) {
  const [isPending, startTransition] = useTransition();

  const [optimisticAppointments, setOptimisticAppointments] = useOptimistic(
    initialAppointments,
    (state: Appointment[], action: OptimisticAction) => {
      switch (action.type) {
        case "UPDATE_STATUS":
          return state.map((apt) =>
            apt.id === action.id ? { ...apt, status: action.status } : apt
          );
        case "ADD_APPOINTMENT":
          return [action.appointment, ...state];
        case "DELETE_APPOINTMENT":
          return state.filter((apt) => apt.id !== action.id);
        default:
          return state;
      }
    }
  );

  const updateStatusOptimistic = async (id: string, newStatus: Appointment["status"]) => {
    startTransition(async () => {
      setOptimisticAppointments({
        type: "UPDATE_STATUS",
        id,
        status: newStatus,
      });

      try {
        await updateAppointment(id, { status: newStatus });
      } catch (error) {
        console.error("Failed to update appointment status:", error);
      }
    });
  };

  return {
    appointments: optimisticAppointments,
    updateStatusOptimistic,
    isPending,
  };
}
