import { createSlice} from '@reduxjs/toolkit';

const initialState = {
    token: localStorage.getItem("token") || null,
    role: localStorage.getItem("role") || null,
    isAuthenticated: !!localStorage.getItem("token"),
    status: "idle",
    error: null,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers:{
        setCredentials: (state, action) =>{
            const {token, role} = action.payload;
            state.token = token;
            state.role = role;
            state.isAuthenticated = true;
            state.error = null;

            localStorage.setItem("token", token);
            localStorage.setItem("role", role);

        },
        logout: (state) =>{
            state.token = null;
            state.role = null;
            state.isAuthenticated = false;
            state.error = null;
            localStorage.removeItem("token");
            localStorage.removeItem("role");
        },
        setAuthError: (state, action) =>{
            state.error = action.payload;
        },
        setAuthLoading: (state, action) => {
            state.status = action.payload ? "loading" : "idle";
        },
        clearAuthError: (state) => {
            state.error = null;
        },
    },
});

export const { setCredentials, logout, setAuthError, setAuthLoading, clearAuthError} = authSlice.actions;
export default authSlice.reducer;

