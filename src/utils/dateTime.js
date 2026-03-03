export function formatTimeHHmm(value, emptyValue = "-") {
    return value ? String(value).slice(0, 5) : emptyValue;
}

export function toAppointmentDateTime(appointmentDate, appointmentTime) {
    if (!appointmentDate || !appointmentTime) return null;
    return new Date(`${appointmentDate}T${appointmentTime}`);
}

export function isFutureAppointment(appointmentDate, appointmentTime, now = new Date()) {
    const dateTime = toAppointmentDateTime(appointmentDate, appointmentTime);
    if (!dateTime || Number.isNaN(dateTime.getTime())) return false;
    return dateTime.getTime() > now.getTime();
}

export function isPastAppointment(appointmentDate, appointmentTime, now = new Date()) {
    const dateTime = toAppointmentDateTime(appointmentDate, appointmentTime);
    if (!dateTime || Number.isNaN(dateTime.getTime())) return false;
    return dateTime.getTime() <= now.getTime();
}
