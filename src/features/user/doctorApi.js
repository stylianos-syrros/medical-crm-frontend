import client from "../../api/client";

export async function createMyDoctorProfile(payload) { 
  const response = await client.post("/api/doctors/me", payload);
  return response.data;
}

export async function getMyDoctorProfile() {
  const response = await client.get("/api/doctors/me");
  return response.data;
}

export async function updateMyDoctorProfile(payload) {
  const response = await client.put("/api/doctors/me", payload);
  return response.data;
}

export async function getMyPatients() {
  const response = await client.get("/api/doctors/me/patients");
  return response.data;
}

export async function getMyAppointments() { ///
  const response = await client.get("/api/doctors/me/appointments");
  return response.data;
}

export async function getMyAppointmentsHistory() { ///
  const response = await client.get("/api/doctors/me/appointments/history");
  return response.data;
}

export async function getMyUpcomingAppointments() { ///
  const response = await client.get("/api/doctors/me/appointments/upcoming");
  return response.data;
}

export async function updateMyAppointmentNotes(appointmentId, notes) { ///
  await client.put(`/api/doctors/me/appointments/${appointmentId}/notes`, { notes });
}

export async function completeMyAppointment(appointmentId) { ///
  await client.put(`/api/doctors/me/appointments/${appointmentId}/complete`);
}
