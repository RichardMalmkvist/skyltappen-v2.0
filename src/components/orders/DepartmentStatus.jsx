import React from "react";

export const DEPARTMENT_NAMES = ["Layout", "Produktion", "Montering", "Packning"];
export const DEPARTMENT_STATES = [
  { id: "ej_paborjad", label: "Ej påbörjad", color: "#bf5555" },
  { id: "paborjad", label: "Påbörjad", color: "#347da9" },
  { id: "pausad", label: "Pausad", color: "#c18a30" },
  { id: "klar", label: "Klar", color: "#238558" },
];
export const selectedDepartments = order => DEPARTMENT_NAMES.filter(name => order?.productionPlan?.departments?.[name]?.enabled);
export const allDepartmentsComplete = order => {
  const selected = selectedDepartments(order);
  return selected.length > 0 && selected.every(name => order.productionPlan.departments[name].status === "klar");
};
export function DepartmentStatusIcon({ status = "ej_paborjad", size = 19 }) {
  const state = DEPARTMENT_STATES.find(item => item.id === status) || DEPARTMENT_STATES[0];
  const path = {
    ej_paborjad: <path d="M5 12h14" />,
    paborjad: <path d="M8 5v14l11-7z" fill="currentColor" stroke="none" />,
    pausad: <><path d="M8 5v14M16 5v14" strokeWidth="3.2" /></>,
    klar: <path d="M4 12.5l5.5 5L20 6" strokeWidth="3" />,
  }[status] || <path d="M5 12h14" />;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={state.color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{path}</svg>;
}
