import client from "../../api/client";

export async function loginUser(credentials) {
    const response = await client.post("/api/auth/login", credentials);
    return response.data;
}
