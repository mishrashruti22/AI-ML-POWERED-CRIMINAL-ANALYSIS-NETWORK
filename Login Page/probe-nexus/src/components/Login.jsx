import { useState } from "react";
import "../styles/login.css";
import {
    loginWithEmail,
    loginWithDeptId,
    setSession,
} from "../auth/authService";

/* ── Icons ──────────────────────────────────────────────── */

const IconUser = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c.8-4 3.4-6 8-6s7.2 2 8 6" />
    </svg>
);

const IconLock = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
);

const IconEye = ({ size = 21 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
    </svg>
);

const IconEyeOff = ({ size = 21 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.9 5.2A10.4 10.4 0 0 1 12 5c6 0 9.5 7 9.5 7a16.8 16.8 0 0 1-3.1 3.8" />
        <path d="M6.6 6.7C3.7 8.4 2.5 12 2.5 12s3.5 7 9.5 7c1.4 0 2.7-.3 3.8-.8" />
    </svg>
);

const IconArrow = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h13" />
        <path d="m13 6 6 6-6 6" />
    </svg>
);

const IconShield = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3 20 6v5c0 5-3.2 8.6-8 10-4.8-1.4-8-5-8-10V6l8-3Z" />
        <circle cx="12" cy="11" r="2.5" />
        <path d="M12 13.5V17" />
    </svg>
);

const IconBadge = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M3 11h18" />
        <circle cx="12" cy="4" r="2" />
        <path d="M12 6v5" />
    </svg>
);

/* ── Role tabs ───────────────────────────────────────────── */

const roles = [
    { id: "investigator", label: "Investigator" },
    { id: "admin",        label: "Admin" },
    { id: "analyst",      label: "Analyst" },
];

const DEPT_ID_REGEX = /^[A-Z]{3}[0-9]{2}$/;

/* ================================================================
   LOGIN COMPONENT
   ================================================================
   All authentication is handled via authService.js.
   When the backend is ready, only authService.js needs updating.
================================================================ */

export default function Login({ onNavigate, onLoginSuccess }) {
    const navigate = (page) => { if (onNavigate) onNavigate(page); };

    // ── Credentials mode fields ──
    const [email,        setEmail]        = useState("");
    const [password,     setPassword]     = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe,   setRememberMe]   = useState(false);
    const [selectedRole, setSelectedRole] = useState("investigator");

    // ── Login mode: "credentials" | "department" ──
    const [loginMode, setLoginMode] = useState("credentials");

    // ── Department ID mode fields ──
    const [deptId,      setDeptId]      = useState("");
    const [deptIdError, setDeptIdError] = useState("");
    const [deptPassword, setDeptPassword] = useState("");
    const [showDeptPw,   setShowDeptPw]   = useState(false);

    // ── Message ──
    const [message,     setMessage]     = useState({ text: "", type: "" });
    const [isLoading,   setIsLoading]   = useState(false);

    /* ──────────────────────────────────────────────────
       CREDENTIAL LOGIN
    ────────────────────────────────────────────────── */

    const handleLogin = async (event) => {
        event.preventDefault();
        setMessage({ text: "", type: "" });

        if (!email.trim()) {
            setMessage({ text: "Please enter your username or email.", type: "error" });
            return;
        }
        if (!password.trim()) {
            setMessage({ text: "Please enter your password.", type: "error" });
            return;
        }

        setIsLoading(true);

        /*
         * BACKEND JWT AUTHENTICATION
         * POST /api/auth/login -> returns { token, user }
         */
        const result = await loginWithEmail(email.trim(), password);

        setIsLoading(false);

        if (!result.success) {
            setMessage({ text: result.error, type: "error" });
            return;
        }

        // Notify App to switch page
        if (onLoginSuccess) onLoginSuccess(result.user);
    };

    /* ──────────────────────────────────────────────────
       DEPARTMENT ID LOGIN
    ────────────────────────────────────────────────── */

    const handleDeptIdChange = (e) => {
        const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (raw.length <= 5) setDeptId(raw);
        if (raw.length === 5 && !DEPT_ID_REGEX.test(raw)) {
            setDeptIdError("Department ID must be 3 uppercase letters followed by 2 numbers.");
        } else {
            setDeptIdError("");
        }
        setMessage({ text: "", type: "" });
    };

    const handleDepartmentLogin = async (event) => {
        event.preventDefault();
        setMessage({ text: "", type: "" });

        if (!deptId.trim()) {
            setDeptIdError("Please enter your Department ID.");
            return;
        }
        if (!DEPT_ID_REGEX.test(deptId)) {
            setDeptIdError("Department ID must be 3 uppercase letters followed by 2 numbers.");
            return;
        }
        if (!deptPassword.trim()) {
            setMessage({ text: "Please enter your password.", type: "error" });
            return;
        }

        setIsLoading(true);

        /*
         * BACKEND JWT AUTHENTICATION
         * POST /api/auth/login -> { departmentId, password }
         */
        const result = await loginWithDeptId(deptId, deptPassword);

        setIsLoading(false);

        if (!result.success) {
            setMessage({ text: result.error, type: "error" });
            return;
        }

        if (onLoginSuccess) onLoginSuccess(result.user);
    };

    /* ──────────────────────────────────────────────────
       FORGOT PASSWORD
    ────────────────────────────────────────────────── */

    const handleForgotPassword = (event) => {
        event.preventDefault();
        navigate("forgot-password");
    };

    /* ================================================================
       RENDER
    ================================================================ */

    return (
        <div className="login-page">

            {/* ================= NAVBAR ================= */}
            <header className="login-navbar">

                <div className="brand-area">
                    <a href="/" className="brand-link" aria-label="ProbNexus Home">
                        <img src="/logo.png" alt="ProbNexus" className="brand-logo" />
                        <span className="brand-name">ProbNexus</span>
                    </a>
                </div>

                <div className="navbar-actions">
                    <button
                        className="theme-button"
                        type="button"
                        aria-label="Toggle theme"
                        onClick={() => document.body.classList.toggle("dark-preview")}
                    >
                        <span>☼</span>
                    </button>
                    <span className="navbar-divider" />
                    <button className="profile-button" type="button" aria-label="User profile">
                        <IconUser size={19} />
                    </button>
                </div>

            </header>


            {/* ================= HERO / LOGIN SECTION ================= */}
            <main className="login-hero">

                <div className="hero-overlay" />

                {/* Left Content */}
                <section className="investigation-intro">

                    <div className="intro-category">
                        CRIMINAL NETWORK ANALYSIS
                        <span>/</span>
                        CYBERSECURITY
                        <span>/</span>
                        INTELLIGENCE
                    </div>

                    <h1>
                        Connections
                        <br />
                        Reveal <span>Truth.</span>
                    </h1>

                    <p className="intro-description">
                        From scattered evidence to
                        <br />
                        a complete picture.
                    </p>

                    <div className="intro-line" />

                    <div className="investigation-stages">
                        <div className="stage"><span className="stage-dot" /><span>Investigate</span></div>
                        <div className="stage"><span className="stage-dot" /><span>Analyze</span></div>
                        <div className="stage"><span className="stage-dot" /><span>Connect</span></div>
                        <div className="stage"><span className="stage-dot" /><span>Prevent</span></div>
                    </div>

                </section>


                {/* ================= LOGIN CARD ================= */}
                <section className="login-card" aria-label="Secure Login">

                    <div className="login-card-content">

                        {/* Logo */}
                        <div className="login-brand">
                            <img src="/logo.png" alt="ProbNexus logo" className="login-logo" />
                            <h2>ProbNexus</h2>
                            <p>
                                CRIMINAL NETWORK ANALYSIS &amp;
                                <br />
                                CYBERSECURITY BUREAU
                            </p>
                        </div>

                        {/* ── CREDENTIALS LOGIN ── */}
                        {loginMode === "credentials" && (
                            <form onSubmit={handleLogin} className="login-form" noValidate>

                                {/* Email / Username */}
                                <div className="input-wrapper">
                                    <span className="input-icon"><IconUser /></span>
                                    <input
                                        type="text"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setMessage({ text: "", type: "" }); }}
                                        placeholder="Username / Official Email"
                                        autoComplete="username"
                                        id="login-email"
                                    />
                                </div>

                                {/* Password */}
                                <div className="input-wrapper">
                                    <span className="input-icon"><IconLock /></span>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); setMessage({ text: "", type: "" }); }}
                                        placeholder="Password"
                                        autoComplete="current-password"
                                        id="login-password"
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <IconEyeOff /> : <IconEye />}
                                    </button>
                                </div>

                                {/* Remember / Forgot */}
                                <div className="form-options">
                                    <label className="remember-option">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            id="login-remember"
                                        />
                                        <span className="custom-checkbox" />
                                        <span>Remember me</span>
                                    </label>
                                    <button
                                        type="button"
                                        className="forgot-password"
                                        onClick={handleForgotPassword}
                                    >
                                        Forgot password?
                                    </button>
                                </div>

                                {/* Login Button */}
                                <button
                                    type="submit"
                                    className="login-button"
                                    disabled={isLoading}
                                    id="login-submit"
                                >
                                    <span>{isLoading ? "Verifying…" : "Secure Login"}</span>
                                    <IconArrow />
                                </button>

                                {/* Divider */}
                                <div className="or-divider">
                                    <span /><p>OR</p><span />
                                </div>

                                {/* Department ID button */}
                                <button
                                    type="button"
                                    className="department-button"
                                    onClick={() => { setLoginMode("department"); setMessage({ text: "", type: "" }); }}
                                    id="login-dept-toggle"
                                >
                                    <IconShield />
                                    <span>Login with Department ID</span>
                                </button>

                                {/* Role Selection */}
                                <div className="role-selector">
                                    {roles.map((role) => (
                                        <button
                                            key={role.id}
                                            type="button"
                                            className={`role-option ${selectedRole === role.id ? "selected" : ""}`}
                                            onClick={() => { setSelectedRole(role.id); setMessage({ text: "", type: "" }); }}
                                        >
                                            <span className="role-icon"><IconUser size={18} /></span>
                                            <span>{role.label}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Status message */}
                                {message.text && (
                                    <div
                                        className="login-message"
                                        role="alert"
                                        style={{
                                            background: message.type === "error"
                                                ? "rgba(142,16,38,0.07)"
                                                : "rgba(74,154,110,0.08)",
                                            borderColor: message.type === "error"
                                                ? "rgba(142,16,38,0.15)"
                                                : "rgba(74,154,110,0.22)",
                                            color: message.type === "error" ? "#741126" : "#2e7a55",
                                        }}
                                    >
                                        {message.text}
                                    </div>
                                )}

                                {/* Create account link */}
                                <div style={{ textAlign: "center", marginTop: "14px", fontSize: "12px", color: "#696364" }}>
                                    New investigator?{" "}
                                    <button
                                        type="button"
                                        onClick={() => navigate("signup")}
                                        style={{
                                            background: "none", border: "none",
                                            color: "#8e1026", fontSize: "12px",
                                            fontWeight: 600, cursor: "pointer", padding: 0,
                                        }}
                                        id="login-create-account"
                                    >
                                        Create an account
                                    </button>
                                </div>

                            </form>
                        )}


                        {/* ── DEPARTMENT ID LOGIN ── */}
                        {loginMode === "department" && (
                            <form onSubmit={handleDepartmentLogin} className="login-form" noValidate>

                                <div style={{ textAlign: "center", marginBottom: "16px" }}>
                                    <span style={{
                                        fontSize: "9px", letterSpacing: "2.5px",
                                        fontWeight: 600, color: "#8e1026",
                                    }}>
                                        DEPARTMENT ID AUTHENTICATION
                                    </span>
                                </div>

                                {/* Department ID */}
                                <div className={`input-wrapper ${deptIdError ? "error-field" : ""}`}
                                    style={{ border: deptIdError ? "1px solid rgba(142,16,38,0.5)" : undefined }}>
                                    <span className="input-icon"><IconBadge /></span>
                                    <input
                                        type="text"
                                        value={deptId}
                                        onChange={handleDeptIdChange}
                                        placeholder="Department ID  (e.g. ABC20)"
                                        maxLength={5}
                                        autoComplete="off"
                                        id="login-deptid"
                                        style={{ fontFamily: "'Courier New', monospace", fontSize: "14px", letterSpacing: "2px", fontWeight: 700 }}
                                    />
                                </div>

                                {deptIdError && (
                                    <p style={{ fontSize: "11px", color: "#8e1026", margin: "-8px 0 10px 4px", lineHeight: 1.4 }}>
                                        {deptIdError}
                                    </p>
                                )}

                                {/* Password */}
                                <div className="input-wrapper">
                                    <span className="input-icon"><IconLock /></span>
                                    <input
                                        type={showDeptPw ? "text" : "password"}
                                        value={deptPassword}
                                        onChange={(e) => { setDeptPassword(e.target.value); setMessage({ text: "", type: "" }); }}
                                        placeholder="Password"
                                        autoComplete="current-password"
                                        id="login-dept-password"
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowDeptPw(!showDeptPw)}
                                        aria-label={showDeptPw ? "Hide password" : "Show password"}
                                    >
                                        {showDeptPw ? <IconEyeOff /> : <IconEye />}
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    className="login-button"
                                    disabled={isLoading}
                                    id="login-dept-submit"
                                >
                                    <span>{isLoading ? "Verifying…" : "Secure Login"}</span>
                                    <IconArrow />
                                </button>

                                {/* Status message */}
                                {message.text && (
                                    <div className="login-message" role="alert"
                                        style={{
                                            background: message.type === "error" ? "rgba(142,16,38,0.07)" : "rgba(74,154,110,0.08)",
                                            borderColor: message.type === "error" ? "rgba(142,16,38,0.15)" : "rgba(74,154,110,0.22)",
                                            color: message.type === "error" ? "#741126" : "#2e7a55",
                                        }}>
                                        {message.text}
                                    </div>
                                )}

                                {/* Switch back */}
                                <div className="or-divider"><span /><p>OR</p><span /></div>
                                <button
                                    type="button"
                                    className="department-button"
                                    onClick={() => { setLoginMode("credentials"); setMessage({ text: "", type: "" }); setDeptId(""); setDeptPassword(""); setDeptIdError(""); }}
                                >
                                    <IconUser />
                                    <span>Login with Email / Username</span>
                                </button>

                                <div style={{ textAlign: "center", marginTop: "14px", fontSize: "12px", color: "#696364" }}>
                                    New investigator?{" "}
                                    <button type="button" onClick={() => navigate("signup")}
                                        style={{ background: "none", border: "none", color: "#8e1026", fontSize: "12px", fontWeight: 600, cursor: "pointer", padding: 0 }}>
                                        Create an account
                                    </button>
                                </div>

                            </form>
                        )}

                    </div>

                </section>

            </main>


            {/* ================= FOOTER ================= */}
            <footer className="login-footer">
                <div className="footer-brand">
                    <span className="footer-shield"><IconShield size={25} /></span>
                    <span className="footer-name">ProbNexus</span>
                </div>
                <div className="footer-line" />
                <span className="footer-tagline">JUSTICE THROUGH INTELLIGENCE</span>
            </footer>

        </div>
    );
}
