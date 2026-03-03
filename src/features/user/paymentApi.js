import client from "../../api/client";

// PATIENT 

export async function makeMyPayment(payload) {
    const response = await client.post("/api/payments/patient/me", payload);
    return response.data;
}

export async function getMyPaidAppointments() {
    const response = await client.get("/api/payments/patient/me/paid");
    return response.data;
}

export async function getMyUnpaidAppointments() {
    const response = await client.get("/api/payments/patient/me/unpaid");
    return response.data;
}

export async function getMyTotalPaid() {
    const response = await client.get("/api/payments/patient/me/total-paid");
    return response.data;
}

export async function getMyTotalPending() {
    const response = await client.get("/api/payments/patient/me/total-pending");
    return response.data;
}

export async function getMyTotalExpected() {
    const response = await client.get("/api/payments/patient/me/total-expected");
    return response.data;
}

// DOCTOR 

export async function getMyDoctorTotalReceived() {
    const response = await client.get("/api/payments/doctor/me/received");
    return response.data;
}

export async function getMyDoctorTotalPending() {
    const response = await client.get("/api/payments/doctor/me/pending");
    return response.data;
}

export async function getMyDoctorTotalExpected() {
    const response = await client.get("/api/payments/doctor/me/expected");
    return response.data;
}

export async function getMyDoctorPaidAppointments() {
    const response = await client.get("/api/payments/doctor/me/paid");
    return response.data;
}

export async function getMyDoctorUnpaidAppointments() {
    const response = await client.get("/api/payments/doctor/me/unpaid");
    return response.data;
}

// ADMIN

export async function getAllPayments() {
    const response = await client.get("/api/payments");
    return response.data;
}
