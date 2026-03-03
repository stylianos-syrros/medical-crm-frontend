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
