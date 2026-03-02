import client from "../../api/client";

export async function getAllMedicalServices() {
    const response = await client.get("/services");
    return response.data;
}

export async function createMedicalService(payload) {
    const response = await client.post("/services", payload);
    return response.data;
}

export async function updateMedicalService(serviceId, payload) {
    const response = await client.put(`/services/${serviceId}`, payload);
    return response.data;
}

export async function deleteMedicalService(serviceId) {
    await client.delete(`/services/${serviceId}`);
}
