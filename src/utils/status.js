export const APPOINTMENT_STATUS_LABELS = {
    SCHEDULED: "Scheduled",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
};

export function normalizeStatus(status) {
    return String(status || "").toUpperCase();
}

export function getAppointmentStatusLabel(status) {
    const normalized = normalizeStatus(status);
    return APPOINTMENT_STATUS_LABELS[normalized] || normalized || "-";
}
