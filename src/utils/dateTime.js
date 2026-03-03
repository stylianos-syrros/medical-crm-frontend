export function formatTimeHHmm(value, emptyValue = "-") {
    return value ? String(value).slice(0, 5) : emptyValue;
}

export function formatDateDDMMYYYY(value, emptyValue = "-") {
    if (!value) return emptyValue;

    const raw = String(value).trim();
    const datePart = raw.includes("T") ? raw.slice(0, 10) : raw;

    const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;

    return datePart;
}

export function formatDateTimeDDMMYYYY(value, emptyValue = "-") {
    if (!value) return emptyValue;

    const raw = String(value).trim();
    const datePart = formatDateDDMMYYYY(raw);

    if (!raw.includes("T")) return datePart;

    const timePart = raw.split("T")[1] || "";
    if (!timePart) return datePart;

    const hhmmMatch = timePart.match(/^(\d{2}):(\d{2})/);
    if (!hhmmMatch) return datePart;

    return `${datePart} ${hhmmMatch[1]}:${hhmmMatch[2]}`;
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
