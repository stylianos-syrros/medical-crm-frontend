import client from "../../api/client";

export async function getAllUsers() {
    const response = await client.get("/api/users");
    return response.data;
}

export async function createUser(user){
    const response = await client.post("/api/users", user);
    return response.data;
}

export async function enableUser(userId){
    const response = await client.put(`/api/users/${userId}/enable`);
    return response.data;
}

export async function disableUser(userId){
    const response = await client.put(`/api/users/${userId}/disable`);
    return response.data;
}

export async function changeUserRole(userId, role){
    const response = await client.put(`/api/users/${userId}/role`, { role });
    return response.data;
}

export async function updateUser(userId, payload) {
    const response = await client.put(`/api/users/${userId}`, payload);
    return response.data;
}

export async function changePassword(userId, payload) {
    const response = await client.put(`/api/users/${userId}/password`, payload);
    return response.data;
}


