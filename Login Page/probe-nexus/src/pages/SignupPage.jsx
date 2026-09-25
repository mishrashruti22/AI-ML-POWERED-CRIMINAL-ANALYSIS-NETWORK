import { useState, useRef, useEffect, useCallback } from "react";
import "../styles/signup.css";
import {
    registerUser,
    generateOtp,
    verifyOtp,
} from "../auth/authService";

/* ------------------------------------------------------------------ */
/* SVG Icons (inline — no extra deps)                                  */
/* ------------------------------------------------------------------ */

const IconUser = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c.8-4 3.4-6 8-6s7.2 2 8 6" />
    </svg>
);

const IconMail = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
);

const IconLock = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
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

const IconEye = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
    </svg>
);

const IconEyeOff = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.9 5.2A10.4 10.4 0 0 1 12 5c6 0 9.5 7 9.5 7a16.8 16.8 0 0 1-3.1 3.8" />
        <path d="M6.6 6.7C3.7 8.4 2.5 12 2.5 12s3.5 7 9.5 7c1.4 0 2.7-.3 3.8-.8" />
    </svg>
);

const IconCheck = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const IconArrow = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h13" />
        <path d="m13 6 6 6-6 6" />
    </svg>
);

const IconArrowLeft = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H6" />
        <path d="m12 5-7 7 7 7" />
    </svg>
);

/* ------------------------------------------------------------------ */
/* Dept ID regex                                                        */
/* ------------------------------------------------------------------ */

const DEPT_ID_REGEX = /^[A-Z]{3}[0-9]{2}$/;

/* ------------------------------------------------------------------ */
/* Password strength utility                                           */
/* ------------------------------------------------------------------ */

function getPasswordStrength(pw) {
    let score = 0;
    if (pw.length >= 8)             score++;
    if (/[A-Z]/.test(pw))           score++;
    if (/[a-z]/.test(pw))           score++;
    if (/[0-9]/.test(pw))           score++;
    if (score <= 1) return "weak";
    if (score <= 3) return "medium";
    return "strong";
}

/* ------------------------------------------------------------------ */
/* STEP INDICATOR                                                       */
/* ------------------------------------------------------------------ */

function StepIndicator({ step }) {
    const steps = ["Info", "Verify", "Password"];
    return (
        <div className="step-indicator">
            {steps.map((label, i) => {
                const idx = i + 1;
                const isDone   = step > idx;
                const isActive = step === idx;
                return (
                    <div key={label} style={{ display: "flex", alignItems: "center" }}>
                        <div
                            className={`step-dot ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
                            title={label}
                        >
                            {isDone ? <IconCheck size={11} /> : idx}
                        </div>
                        {i < steps.length - 1 && <div className="step-line" />}
                    </div>
                );
            })}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* MAIN SIGNUP PAGE                                                     */
/* ------------------------------------------------------------------ */

export default function SignupPage({ onNavigate }) {
    const navigate = (page) => { if (onNavigate) onNavigate(page); };

    // ── Step state: 1 = Personal Info, 2 = OTP, 3 = Password ──
    const [step, setStep] = useState(1);

    // ── Step 1 fields ──
    const [fullName,     setFullName]     = useState("");
    const [role,         setRole]         = useState("investigator");
    const [departmentId, setDepartmentId] = useState("");
    const [deptError,    setDeptError]    = useState("");

    // ── Step 2 fields ──
    const [email,         setEmail]         = useState("");
    const [emailError,    setEmailError]    = useState("");
    const [otpSent,       setOtpSent]       = useState(false);
    const [demoOtp,       setDemoOtp]       = useState("");
    const [otpValues,     setOtpValues]     = useState(["", "", "", "", "", ""]);
    const [emailVerified, setEmailVerified] = useState(false);
    const [otpError,      setOtpError]      = useState("");
    const [resendTimer,   setResendTimer]   = useState(0);

    // ── Step 3 fields ──
    const [password,        setPassword]        = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPw,          setShowPw]          = useState(false);
    const [showConfirmPw,   setShowConfirmPw]   = useState(false);
    const [pwError,         setPwError]         = useState("");
    const [consent,         setConsent]         = useState(false);

    // ── General message ──
    const [message,     setMessage]     = useState({ text: "", type: "" });

    const otpInputRefs = useRef([]);
    const resendIntervalRef = useRef(null);

    // ── Cleanup on unmount ──
    useEffect(() => () => clearInterval(resendIntervalRef.current), []);

    /* ── Resend countdown ── */
    function startResendCountdown() {
        setResendTimer(30);
        clearInterval(resendIntervalRef.current);
        resendIntervalRef.current = setInterval(() => {
            setResendTimer((t) => {
                if (t <= 1) { clearInterval(resendIntervalRef.current); return 0; }
                return t - 1;
            });
        }, 1000);
    }

    /* ================================================================
       STEP 1 — PERSONAL INFO
    ================================================================ */

    function handleDeptIdChange(e) {
        const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
        if (raw.length <= 5) setDepartmentId(raw);

        if (raw.length === 5) {
            if (!DEPT_ID_REGEX.test(raw)) {
                setDeptError("Department ID must contain 3 uppercase letters followed by 2 numbers.");
            } else {
                setDeptError("");
            }
        } else {
            setDeptError("");
        }
    }

    function handleStep1Next() {
        if (!fullName.trim()) {
            setMessage({ text: "Please enter your full name.", type: "error" });
            return;
        }
        if (!departmentId.trim()) {
            setMessage({ text: "Please enter your Department ID.", type: "error" });
            return;
        }
        if (!DEPT_ID_REGEX.test(departmentId)) {
            setDeptError("Department ID must contain 3 uppercase letters followed by 2 numbers.");
            setMessage({ text: "Please fix validation errors.", type: "error" });
            return;
        }
        setMessage({ text: "", type: "" });
        setStep(2);
    }

    /* ================================================================
       STEP 2 — EMAIL OTP
    ================================================================ */

    function validateEmail(val) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    }

    function handleSendOtp() {
        if (!email.trim()) {
            setEmailError("Please enter your official email address.");
            return;
        }
        if (!validateEmail(email)) {
            setEmailError("Please enter a valid email address.");
            return;
        }
        setEmailError("");

        // FRONTEND PROTOTYPE: generate OTP locally
        // In production: POST /api/auth/send-otp { email }
        const { otp } = generateOtp(email);
        setDemoOtp(otp);
        setOtpSent(true);
        setOtpValues(["", "", "", "", "", ""]);
        setOtpError("");
        startResendCountdown();

        setMessage({ text: "", type: "" });
    }

    function handleOtpChange(index, val) {
        const digit = val.replace(/\D/g, "").slice(-1);
        const newVals = [...otpValues];
        newVals[index] = digit;
        setOtpValues(newVals);
        setOtpError("");

        // Auto-advance
        if (digit && index < 5) {
            otpInputRefs.current[index + 1]?.focus();
        }
    }

    function handleOtpKeyDown(index, e) {
        if (e.key === "Backspace" && !otpValues[index] && index > 0) {
            otpInputRefs.current[index - 1]?.focus();
        }
    }

    function handleOtpPaste(e) {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        const newVals = [...otpValues];
        for (let i = 0; i < pasted.length; i++) newVals[i] = pasted[i];
        setOtpValues(newVals);
    }

    function handleVerifyOtp() {
        const entered = otpValues.join("");
        if (entered.length < 6) {
            setOtpError("Please enter the complete 6-digit verification code.");
            return;
        }
        // In production: POST /api/auth/verify-otp { email, otp }
        const result = verifyOtp(email, entered);
        if (result.success) {
            setEmailVerified(true);
            setOtpError("");
            setDemoOtp("");
            setMessage({ text: "", type: "" });
        } else {
            setOtpError(result.error);
        }
    }

    function handleResendOtp() {
        const { otp } = generateOtp(email);
        setDemoOtp(otp);
        setOtpValues(["", "", "", "", "", ""]);
        setOtpError("");
        startResendCountdown();
    }

    function handleStep2Next() {
        if (!emailVerified) {
            setMessage({ text: "Please verify your email before continuing.", type: "error" });
            return;
        }
        setMessage({ text: "", type: "" });
        setStep(3);
    }

    /* ================================================================
       STEP 3 — PASSWORD
    ================================================================ */

    const pwStrength = getPasswordStrength(password);

    function validatePassword(pw) {
        if (pw.length < 8)             return "Password must be at least 8 characters.";
        if (!/[A-Z]/.test(pw))         return "Password must contain at least one uppercase letter.";
        if (!/[a-z]/.test(pw))         return "Password must contain at least one lowercase letter.";
        if (!/[0-9]/.test(pw))         return "Password must contain at least one number.";
        return "";
    }

    async function handleCreateAccount() {
        const pwValidErr = validatePassword(password);
        if (pwValidErr) { setPwError(pwValidErr); return; }
        if (password !== confirmPassword) {
            setPwError("Passwords do not match.");
            return;
        }
        if (!consent) {
            setMessage({ text: "Please accept the terms of use to continue.", type: "error" });
            return;
        }

        setMessage({ text: "Creating your account...", type: "" });

        // Await the async registerUser call (hits backend POST /api/auth/register)
        const result = await registerUser({
            fullName:     fullName.trim(),
            departmentId,
            role,
            email:        email.toLowerCase().trim(),
            password,
        });

        if (!result.success) {
            setMessage({ text: result.error || "Registration failed. Please try again.", type: "error" });
            return;
        }

        setMessage({
            text: "Account created successfully. Please sign in using your registered credentials.",
            type: "success"
        });

        // Redirect to login after short delay
        setTimeout(() => navigate("login"), 2200);
    }

    /* ================================================================
       SHARED NAVBAR
    ================================================================ */

    function NavBar() {
        return (
            <header className="signup-navbar">
                <button
                    type="button"
                    className="signup-brand-link"
                    onClick={() => navigate("login")}
                    aria-label="ProbNexus Home"
                >
                    <img src="/logo.png" alt="ProbNexus" className="signup-brand-logo" />
                    <span className="signup-brand-name">ProbNexus</span>
                </button>

                <div className="signup-navbar-actions">
                    <button
                        type="button"
                        className="signup-theme-btn"
                        aria-label="Toggle theme"
                        onClick={() => document.body.classList.toggle("dark-preview")}
                    >
                        ☼
                    </button>
                    <div className="signup-nav-divider" />
                </div>
            </header>
        );
    }

    /* ================================================================
       SHARED FOOTER
    ================================================================ */

    function Footer() {
        return (
            <footer className="signup-footer">
                <div className="signup-footer-brand">
                    <IconShield size={22} style={{ color: "rgba(255,255,255,0.7)" }} />
                    <span className="signup-footer-name">ProbNexus</span>
                </div>
                <div className="signup-footer-line" />
                <span className="signup-footer-tagline">JUSTICE THROUGH INTELLIGENCE</span>
            </footer>
        );
    }

    /* ================================================================
       LEFT INTRO PANEL
    ================================================================ */

    const introStages = [
        { label: "Personal Information",  done: step > 1 },
        { label: "Identity Verification", done: step > 2 },
        { label: "Secure Access Setup",   done: step > 3 },
    ];

    /* ================================================================
       RENDER
    ================================================================ */

    return (
        <div className="signup-page">
            <NavBar />

            <main className="signup-hero">
                <div className="signup-hero-overlay" />

                {/* LEFT PANEL */}
                <section className="signup-intro">

                    <div className="signup-category">
                        INVESTIGATOR REGISTRATION
                        <span>/</span>
                        SECURE ACCESS
                    </div>

                    <h1>
                        Join the
                        <br />
                        <span>Network.</span>
                    </h1>

                    <p className="signup-intro-desc">
                        Register your investigator credentials to access
                        the ProbNexus criminal network analysis platform.
                    </p>

                    <div className="signup-intro-line" />

                    <div className="signup-stages">
                        {introStages.map((s) => (
                            <div key={s.label} className="signup-stage">
                                {s.done
                                    ? <span className="signup-stage-check" />
                                    : <span className="signup-stage-dot" />
                                }
                                <span style={{ textDecoration: s.done ? "line-through" : "none", opacity: s.done ? 0.5 : 1 }}>
                                    {s.label}
                                </span>
                            </div>
                        ))}
                    </div>

                </section>


                {/* REGISTRATION CARD */}
                <section className="signup-card" aria-label="Investigator Registration Form">
                    <div className="signup-card-inner">

                        {/* Card header */}
                        <div className="signup-card-header">
                            <img src="/logo.png" alt="ProbNexus" className="signup-card-logo" />
                            <h2>ProbNexus</h2>
                            <p>INVESTIGATOR REGISTRATION / SECURE ACCESS</p>
                        </div>

                        {/* Step indicator */}
                        <StepIndicator step={step} />


                        {/* ============================================
                            STEP 1 — PERSONAL INFO
                        ============================================ */}
                        {step === 1 && (
                            <form
                                className="signup-form"
                                onSubmit={(e) => { e.preventDefault(); handleStep1Next(); }}
                                noValidate
                            >
                                <span className="form-section-label">PERSONAL INFORMATION</span>

                                {/* Full Name */}
                                <div className="su-input-wrapper">
                                    <span className="su-input-icon"><IconUser /></span>
                                    <input
                                        type="text"
                                        placeholder="Enter your full name"
                                        value={fullName}
                                        onChange={(e) => { setFullName(e.target.value); setMessage({ text: "", type: "" }); }}
                                        autoComplete="name"
                                        id="signup-fullname"
                                    />
                                </div>

                                {/* Role */}
                                <div className="su-input-wrapper" style={{ position: "relative" }}>
                                    <span className="su-input-icon"><IconShield /></span>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        id="signup-role"
                                        aria-label="Department / Role"
                                    >
                                        <option value="investigator">Investigator</option>
                                        <option value="analyst">Analyst</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <span className="su-select-arrow">▾</span>
                                </div>

                                {/* Department ID */}
                                <div className={`su-input-wrapper ${deptError ? "error-field" : ""}`}>
                                    <span className="su-input-icon"><IconBadge /></span>
                                    <input
                                        type="text"
                                        placeholder="Department ID  (e.g. ABC20)"
                                        value={departmentId}
                                        onChange={handleDeptIdChange}
                                        maxLength={5}
                                        id="signup-deptid"
                                        autoComplete="off"
                                        style={{ fontFamily: "'Courier New', monospace", fontSize: "14px", letterSpacing: "2px", fontWeight: 700 }}
                                    />
                                </div>

                                {deptError && (
                                    <p className="field-error">{deptError}</p>
                                )}

                                {DEPT_ID_REGEX.test(departmentId) && !deptError && (
                                    <p className="dept-valid-badge">
                                        <IconCheck size={13} /> {departmentId} — Valid Department ID
                                    </p>
                                )}

                                {message.text && (
                                    <div className={`su-message ${message.type}`}>{message.text}</div>
                                )}

                                <button type="submit" className="su-primary-btn" style={{ marginTop: "18px" }}>
                                    <span>Continue</span>
                                    <IconArrow />
                                </button>

                                <div className="back-to-login">
                                    Already registered?{" "}
                                    <button type="button" onClick={() => navigate("login")}>
                                        Sign In
                                    </button>
                                </div>

                            </form>
                        )}


                        {/* ============================================
                            STEP 2 — EMAIL OTP
                        ============================================ */}
                        {step === 2 && (
                            <div className="signup-form">

                                {!otpSent ? (
                                    <>
                                        <span className="form-section-label">IDENTITY VERIFICATION</span>

                                        <div className={`su-input-wrapper ${emailError ? "error-field" : ""}`}>
                                            <span className="su-input-icon"><IconMail /></span>
                                            <input
                                                type="email"
                                                placeholder="Enter official email address"
                                                value={email}
                                                onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                                                autoComplete="email"
                                                id="signup-email"
                                            />
                                        </div>

                                        {emailError && <p className="field-error">{emailError}</p>}

                                        <button
                                            type="button"
                                            className="su-primary-btn"
                                            style={{ marginTop: "8px" }}
                                            onClick={handleSendOtp}
                                        >
                                            <span>Send OTP</span>
                                            <IconArrow />
                                        </button>
                                    </>
                                ) : emailVerified ? (
                                    <>
                                        {/* Verified state */}
                                        <div className="email-verified-badge">
                                            <IconCheck size={18} />
                                            Email Verified
                                        </div>
                                        <p style={{ fontSize: "12px", color: "#696364", textAlign: "center", margin: "0 0 16px" }}>
                                            <strong style={{ color: "#241d1e" }}>{email}</strong> has been verified.
                                        </p>
                                        <button
                                            type="button"
                                            className="su-primary-btn"
                                            onClick={handleStep2Next}
                                        >
                                            <span>Continue to Password Setup</span>
                                            <IconArrow />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {/* OTP entry */}
                                        <div className="otp-header">
                                            <h3>Verify Your Email</h3>
                                            <p>
                                                We&apos;ve sent a verification code to{" "}
                                                <span className="otp-email-highlight">{email}</span>
                                            </p>
                                        </div>

                                        {/* Demo OTP banner — REMOVE when backend is live */}
                                        {demoOtp && (
                                            <div className="demo-otp-banner">
                                                <strong>⚠ DEMO MODE</strong> — No email was sent. Your verification code:
                                                <span className="demo-otp-code">{demoOtp}</span>
                                                <small style={{ display: "block", marginTop: 4, opacity: 0.7 }}>
                                                    Replace with real email service (e.g. SendGrid) when backend is live.
                                                </small>
                                            </div>
                                        )}

                                        {/* 6-box OTP input */}
                                        <div className="otp-boxes" onPaste={handleOtpPaste}>
                                            {otpValues.map((val, i) => (
                                                <input
                                                    key={i}
                                                    ref={(el) => (otpInputRefs.current[i] = el)}
                                                    className={`otp-box ${val ? "filled" : ""}`}
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={1}
                                                    value={val}
                                                    onChange={(e) => handleOtpChange(i, e.target.value)}
                                                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                                    aria-label={`OTP digit ${i + 1}`}
                                                    id={`otp-box-${i}`}
                                                />
                                            ))}
                                        </div>

                                        {otpError && (
                                            <p className="field-error" style={{ textAlign: "center" }}>{otpError}</p>
                                        )}

                                        <button
                                            type="button"
                                            className="su-primary-btn"
                                            onClick={handleVerifyOtp}
                                            disabled={otpValues.join("").length < 6}
                                        >
                                            <span>Verify OTP</span>
                                            <IconCheck />
                                        </button>

                                        <div className="otp-resend">
                                            {resendTimer > 0 ? (
                                                <span>Resend OTP in {resendTimer}s</span>
                                            ) : (
                                                <>
                                                    Didn&apos;t receive it?{" "}
                                                    <button type="button" onClick={handleResendOtp}>
                                                        Resend OTP
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}

                                {message.text && !emailVerified && (
                                    <div className={`su-message ${message.type}`}>{message.text}</div>
                                )}

                                {!emailVerified && (
                                    <div className="back-to-login" style={{ marginTop: "12px" }}>
                                        <button type="button" onClick={() => { setStep(1); setOtpSent(false); setEmailVerified(false); }}>
                                            <IconArrowLeft size={13} style={{ verticalAlign: "middle" }} /> Back
                                        </button>
                                    </div>
                                )}

                            </div>
                        )}


                        {/* ============================================
                            STEP 3 — PASSWORD
                        ============================================ */}
                        {step === 3 && (
                            <form
                                className="signup-form"
                                onSubmit={(e) => { e.preventDefault(); handleCreateAccount(); }}
                                noValidate
                            >
                                <span className="form-section-label">SECURE ACCESS SETUP</span>

                                {/* Password */}
                                <div className="su-input-wrapper">
                                    <span className="su-input-icon"><IconLock /></span>
                                    <input
                                        type={showPw ? "text" : "password"}
                                        placeholder="Create Password"
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); setPwError(""); }}
                                        autoComplete="new-password"
                                        id="signup-password"
                                    />
                                    <button
                                        type="button"
                                        className="su-pw-toggle"
                                        onClick={() => setShowPw(!showPw)}
                                        aria-label={showPw ? "Hide password" : "Show password"}
                                    >
                                        {showPw ? <IconEyeOff /> : <IconEye />}
                                    </button>
                                </div>

                                {/* Strength indicator */}
                                {password && (
                                    <>
                                        <div className="password-strength-bar">
                                            <div className={`strength-segment ${pwStrength === "weak" || pwStrength === "medium" || pwStrength === "strong" ? pwStrength : ""}`} />
                                            <div className={`strength-segment ${pwStrength === "medium" || pwStrength === "strong" ? pwStrength : ""}`} />
                                            <div className={`strength-segment ${pwStrength === "strong" ? pwStrength : ""}`} />
                                        </div>
                                        <p className={`strength-label ${pwStrength}`}>
                                            {pwStrength.charAt(0).toUpperCase() + pwStrength.slice(1)}
                                        </p>
                                    </>
                                )}

                                {/* Confirm Password */}
                                <div className={`su-input-wrapper ${pwError === "Passwords do not match." ? "error-field" : ""}`}>
                                    <span className="su-input-icon"><IconLock /></span>
                                    <input
                                        type={showConfirmPw ? "text" : "password"}
                                        placeholder="Confirm Password"
                                        value={confirmPassword}
                                        onChange={(e) => { setConfirmPassword(e.target.value); setPwError(""); }}
                                        autoComplete="new-password"
                                        id="signup-confirm-password"
                                    />
                                    <button
                                        type="button"
                                        className="su-pw-toggle"
                                        onClick={() => setShowConfirmPw(!showConfirmPw)}
                                        aria-label={showConfirmPw ? "Hide password" : "Show password"}
                                    >
                                        {showConfirmPw ? <IconEyeOff /> : <IconEye />}
                                    </button>
                                </div>

                                {pwError && <p className="field-error">{pwError}</p>}

                                {/* Consent */}
                                <label className="consent-label" htmlFor="signup-consent">
                                    <input
                                        type="checkbox"
                                        id="signup-consent"
                                        checked={consent}
                                        onChange={(e) => { setConsent(e.target.checked); setMessage({ text: "", type: "" }); }}
                                    />
                                    <span className="consent-checkbox" />
                                    <span className="consent-text">
                                        I agree to the ProbNexus{" "}
                                        <a href="#" onClick={(e) => e.preventDefault()}>terms of use</a>
                                        {" "}and secure data handling policy.
                                    </span>
                                </label>

                                {message.text && (
                                    <div className={`su-message ${message.type}`}>{message.text}</div>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    className="su-primary-btn"
                                    disabled={!consent || pwStrength === "weak" || !password || !confirmPassword}
                                >
                                    <span>Create Secure Account</span>
                                    <IconArrow />
                                </button>

                                <div className="back-to-login" style={{ marginTop: "12px" }}>
                                    <button type="button" onClick={() => { setStep(2); setPwError(""); }}>
                                        <IconArrowLeft size={13} style={{ verticalAlign: "middle" }} /> Back
                                    </button>
                                </div>

                            </form>
                        )}

                    </div>
                </section>

            </main>

            <Footer />
        </div>
    );
}
