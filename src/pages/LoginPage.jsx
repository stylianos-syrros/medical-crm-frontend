import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setCredentials, setAuthError, setAuthLoading, clearAuthError } from "../features/auth/authSlice";
import { loginUser } from "../features/auth/authApi";
import { parseRoleFromToken } from "../features/auth/tokenUtils";
import { extractApiErrorMessage } from "../utils/errors";
import { getAnchoredActionMessageStyle, useAnchoredActionMessage } from "../utils/actionMessage";

function LoginPage(){
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { anchor, message, captureActionAnchor, showActionMessage, clearActionMessage } =
        useAnchoredActionMessage();

    const [form,setForm] = useState({ username:"", password:"" });
    
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
    const role = useSelector((state) => state.auth.role);
    const loading = useSelector((state) => state.auth.status === "loading");
    const error = useSelector((state) => state.auth.error)

    useEffect(() => {
        if (!isAuthenticated) return;

        if (role === "ADMIN") navigate("/admin");
        else if (role === "DOCTOR") navigate("/doctor");
        else if (role === "PATIENT") navigate("/patient");
    }, [isAuthenticated, role, navigate]);    
    
    const handleChange = (e) => {
        if (error) {
            dispatch(clearAuthError());
            clearActionMessage();
        }
        setForm((prev) => ({...prev, [e.target.name]: e.target.value }));
    };

    useEffect(() => {
        if (error) {
            showActionMessage(error, "error");
        }
    }, [error]);

    const handlePageClickCapture = (e) => {
        const didClickButton = captureActionAnchor(e);
        if (!didClickButton) return;
        dispatch(clearAuthError());
        clearActionMessage();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;

        dispatch(clearAuthError());
        dispatch(setAuthLoading(true));

        try {
            const data = await loginUser(form);
            const token = data.token;
            const role = parseRoleFromToken(token);

            dispatch(setCredentials({ token, role }));

            if (!role) {
                throw new Error("Unknown role");
            }
        } catch (error){
            const apiMessage = extractApiErrorMessage(error, "Login failed");
            const normalized = String(apiMessage || "").toLowerCase();
            const loginMessage = normalized.includes("disabled")
                ? "Your account is disabled. Please contact admin."
                : apiMessage;

            dispatch(
                setAuthError(loginMessage)
            );
        }finally{
            dispatch(setAuthLoading(false));
        }
    };

    return(
        <div style={{ padding: "24px", maxWidth:"420px"}} onClickCapture={handlePageClickCapture}>
            <h1>Login Page</h1>
            {message?.text && (
                <div style={getAnchoredActionMessageStyle(message.type, anchor)}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "12px"}}>
                    <label>Username</label>
                    <input
                        name="username"
                        value={form.username}
                        onChange={handleChange}
                        style={{width: "100%", padding: "8px"}}
                        required
                    />
                </div>

                <div style={{ marginBottom: "12px"}}>
                    <label>Password</label>
                    <input
                        type ="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        style={{ width: "100%", padding: "8px"}}
                        required
                    />
                </div>


                <button type ="submit" disabled={loading}>
                    {loading ? "Logging in..." : "Login"}
                </button>
            </form>
        </div>
    );
}

export default LoginPage;
