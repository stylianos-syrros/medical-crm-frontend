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
}

export async function disableUser(userId){
    const response = await client.put(`/api/users/${userId}/disable`);
}