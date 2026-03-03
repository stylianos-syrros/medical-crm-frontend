import { toAppointmentDateTime } from "./dateTime";

export function sortAppointmentsByDateTime(appointments = []) {
    return [...appointments].sort((a, b) => {
        const dateA = toAppointmentDateTime(a.appointmentDate, a.appointmentTime);
        const dateB = toAppointmentDateTime(b.appointmentDate, b.appointmentTime);

        const timeA = dateA ? dateA.getTime() : 0;
        const timeB = dateB ? dateB.getTime() : 0;

        return timeA - timeB;
    });
}

export function filterAppointmentsByStatus(appointments = [], status = "ALL") {
    if (status === "ALL") return appointments;
    return appointments.filter(
        (appointment) => String(appointment.status).toUpperCase() === String(status).toUpperCase()
    );
}
