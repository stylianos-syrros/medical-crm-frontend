import axios from "axios";
import { store } from "../app/store"; 

const client = axios.create({
    baseURL: "http://localhost:8080",
    headers: {
        "Content-Type": "application/json"
    },
});

client.interceptors.request.use((config) => {
    const token = store.getState()?.auth?.token;

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export default client;