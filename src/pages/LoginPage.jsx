import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setCredentials, setAuthError, setAuthLoading, clearAuthError } from "../features/auth/authSlice";
import { loginUser } from "../features/auth/authApi";
import { parseRoleFromToken } from "../features/auth/tokenUtils";

function LoginPage(){
    const navigate = useNavigate();
    const dispatch = useDispatch();

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
        }
        setForm((prev) => ({...prev, [e.target.name]: e.target.value }));
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
            dispatch(
                setAuthError(error.response?.data?.message || error.response?.data || error.message || "Login failed")
            );
        }finally{
            dispatch(setAuthLoading(false));
        }
    };

    return(
        <div style={{ padding: "24px", maxWidth:"420px"}}>
            <h1>Login Page</h1>

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

        {error && <p style={{ color: "red", marginTop: "12px"}}>{error}</p>}
        </div>
    );
}

export default LoginPage;
