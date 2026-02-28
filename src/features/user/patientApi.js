import client from"../../api/client";

export async function createMyPatientProfile(payload) {
    const response = await client.post("api/patients/me", payload);
    return response.data;
}

export async function getMyPatientProfile(){
    const response = await client.get(`/api/patients/me`);
    return response.data;
}

export async function updateMyPatientProfile(payload){
    const response = await client.put(`/api/patients/me`, payload);
    return response.data;
}

export async function getMyDoctors() {
    const response = await client.get(`/api/patients/me/doctors`);
    return response.data;
}

export async function getMyAppointments() {
    const response = await client.get(`/api/patients/me/appointments`);
    return response.data;
}

export async function getMyAppointmentHistory() {
    const response = await client.get(`/api/patients/me/appointments/history`);
   return response.data;
}

export async function getMyUpcomingAppointments() {
    const response = await client.get(`/api/patients/me/appointments/upcoming`);
    return response.data;
}

export async function cancelAppointment(appointmentId) {
    await client.delete(`/api/patients/me/appointments/${appointmentId}`);
}