import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setCredentials } from "../features/auth/authSlice";
import { useEffect } from "react";
import { useSelector } from "react-redux";

function parseRoleFromToken(token){
    try{
        const payLoadBase64 = token.split(".")[1];
        const payLoadJson = atob(
            payLoadBase64.replace(/-/g, "+").replace(/_/g, "/")
        );        
        const payload = JSON.parse(payLoadJson);
        return payload.role? payload.role.replace('ROLE_','') : null;
    } catch(error){
            return null;
    }
}

function LoginPage(){
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [form,setForm] = useState({ username:"", password:"" });
    const [error,setError] = useState("");
    const [loading, setloading] = useState(false);
    
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
    const role = useSelector((state) => state.auth.role);

    useEffect(() => {
        if (!isAuthenticated) return;

        if (role === "ADMIN") navigate("/admin");
        else if (role === "DOCTOR") navigate("/doctor");
        else if (role === "PATIENT") navigate("/patient");
    }, [isAuthenticated, role, navigate]);    
    
    const handleChange = (e) => {
            setForm((prev) => ({...prev, [e.target.name]: e.target.value }));
        };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setloading(true);

        try {
            const response = await axios.post("http://localhost:8080/api/auth/login", form,{
                headers: { "Content-Type": "application/json" },
            });

            const token = response.data.token;
            const role = parseRoleFromToken(token);

            dispatch(setCredentials({ token, role }));

            if (role==="ADMIN") navigate("/admin");
            else if (role==="DOCTOR") navigate("/doctor");
            else if (role==="PATIENT") navigate("/patient");
            else throw new Error("Unknown Role");
        } catch (error){
            setError(error.response?.data?.message || error.response?.data || error.message || "Login failed");
        }finally{
            setloading(false);
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
