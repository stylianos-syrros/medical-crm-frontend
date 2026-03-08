import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setCredentials, setAuthError, setAuthLoading, clearAuthError } from "../features/auth/authSlice";
import { loginUser } from "../features/auth/authApi";
import { parseRoleFromToken } from "../features/auth/tokenUtils";
import { extractApiErrorMessage } from "../utils/errors";
import { useAnchoredActionMessage } from "../utils/actionMessage";

function LoginPage(){
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { message, captureActionAnchor, showActionMessage, clearActionMessage } =
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
        <div className="min-h-screen bg-slate-100" onClickCapture={handlePageClickCapture}>
            <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:px-8">
                <section className="hidden rounded-3xl bg-slate-900 p-10 text-white shadow-2xl lg:block">
                    <p className="mb-3 inline-flex rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
                        Medical CRM
                    </p>
                    <h1 className="text-4xl font-bold leading-tight">
                        Welcome back
                    </h1>
                    <p className="mt-4 max-w-md text-slate-300">
                        Sign in to manage appointments, patients, payments, and daily workflows in one place.
                    </p>
                    <div className="mt-8 grid grid-cols-2 gap-4 text-sm text-slate-200">
                        <div className="rounded-xl bg-white/10 p-4">
                            <p className="font-semibold">Fast Access</p>
                            <p className="mt-1 text-slate-300">Role-based dashboard redirect after login.</p>
                        </div>
                        <div className="rounded-xl bg-white/10 p-4">
                            <p className="font-semibold">Secure Auth</p>
                            <p className="mt-1 text-slate-300">Token authentication with protected routes.</p>
                        </div>
                    </div>
                </section>

                <section className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200 sm:p-8">
                    <div className="mb-8">
                        <h2 className="text-3xl font-bold text-slate-900">Login</h2>
                        <p className="mt-2 text-sm text-slate-500">
                            Enter your credentials to continue.
                        </p>
                    </div>

                    {message?.text && (
                        <div
                            className={`mb-5 alert ${
                                message.type === "success" ? "alert-success" : "alert-error"
                            }`}
                        >
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="username" className="mb-2 block text-sm font-medium text-slate-700">
                                Username
                            </label>
                            <input
                                id="username"
                                name="username"
                                value={form.username}
                                onChange={handleChange}
                                className="input"
                                autoComplete="username"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                className="input"
                                autoComplete="current-password"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                        >
                            {loading ? "Logging in..." : "Login"}
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
}

export default LoginPage;
