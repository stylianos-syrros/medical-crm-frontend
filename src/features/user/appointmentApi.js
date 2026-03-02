import client from"../../api/client";

// PATIENT
export async function bookMyAppointment(payload) { 
  const response = await client.post("/api/appointments/patient/me", payload);
  return response.data;
}

export async function cancelMyAppointment(appointmentId){
  await client.delete(`/api/appointments/patient/me/${appointmentId}`);
}

export async function rescheduleMyAppointment(appointmentId, payload) {
  await client.put(`/api/appointments/patient/me/${appointmentId}/reschedule`, payload);
}

export async function getPatientUpcomingAppointments() {
  const response = await client.get("/api/appointments/patient/me/upcoming");
  return response.data;
}

export async function getPatientAppointmentsHistory() {
  const response = await client.get("/api/appointments/patient/me/history");
  return response.data;
}

// DOCTOR
export async function getDoctorUpcomingAppointments() {
  const response = await client.get("/api/appointments/doctor/me/upcoming");
  return response.data;
}

export async function getDoctorAppointmentsHistory() {
  const response = await client.get("/api/appointments/doctor/me/history");
  return response.data;
}

export async function getDoctorAppointmentsByStatus(status) {
  const response = await client.get("/api/appointments/doctor/me/status", {
    params: { status },
  });
  return response.data;
}

export async function cancelDoctorAppointment(appointmentId) {
  await client.delete(`/api/appointments/doctor/me/${appointmentId}/cancel`);
}

export async function completeDoctorAppointment(appointmentId) {
  await client.put(`/api/appointments/doctor/me/${appointmentId}/complete`);
}

export async function updateDoctorAppointmentNotes(appointmentId, notes) {
  await client.put(`/api/appointments/doctor/me/${appointmentId}/notes`, { notes });
}

// ADMIN
export async function getAllAppointments() {
  const response = await client.get("/api/appointments");
  return response.data;
}

export async function getAppointmentsByDate(date) {
  const response = await client.get("/api/appointments/date", { params: { date } });
  return response.data;
}

export async function getAppointmentsByStatus(status) {
  const response = await client.get("/api/appointments/status", { params: { status } });
  return response.data;
}

export async function getAppointmentsByDoctor(doctorId) {
  const response = await client.get(`/api/appointments/doctor/${doctorId}`);
  return response.data;
}

export async function getAppointmentsByPatient(patientId) {
  const response = await client.get(`/api/appointments/patient/${patientId}`);
  return response.data;
}
