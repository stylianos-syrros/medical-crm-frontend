export function getDefaultPatientProfileForm() {
    return {
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        phone: "",
        notes: "",
    };
}

export function getDefaultDoctorProfileForm() {
    return {
        firstName: "",
        lastName: "",
        specialty: "",
        phone: "",
    };
}

export function getDefaultAppointmentBookingForm() {
    return {
        doctorId: "",
        serviceId: "",
        appointmentDate: "",
        appointmentTime: "",
        notes: "",
    };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email) {
    return EMAIL_REGEX.test((email || "").trim());
}
