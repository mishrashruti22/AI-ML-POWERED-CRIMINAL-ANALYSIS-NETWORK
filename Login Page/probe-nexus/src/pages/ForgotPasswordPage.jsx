import { useState, useRef, useEffect } from "react";
import "../styles/forgot-password.css";
import "../styles/signup.css"; /* reuse OTP + form styles */
import {
    emailExists,
    generateOtp,
    verifyOtp,
    resetPassword,
} from "../auth/authService";

/* ── Icons ── */
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

const IconArrowLeft = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H6" />
        <path d="m12 5-7 7 7 7" />
    </svg>
);

const IconArrow = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h13" />
        <path d="m13 6 6 6-6 6" />
    </svg>
);

/* ─────────────────────────────────────────────────── */

function getPasswordStrength(pw) {
    let s = 0;
    if (pw.length >= 8)    s++;
    if (/[A-Z]/.test(pw))  s++;
    if (/[a-z]/.test(pw))  s++;
    if (/[0-9]/.test(pw))  s++;
    if (s <= 1) return "weak";
    if (s <= 3) return "medium";
    return "strong";
}

export default function ForgotPasswordPage({ onNavigate }) {
    const navigate = (p) => { if (onNavigate) onNavigate(p); };

    const [step,          setStep]          = useState(1); // 1=email, 2=otp, 3=newpw
    const [email,         setEmail]         = useState("");
    const [emailError,    setEmailError]    = useState("");
    const [otpValues,     setOtpValues]     = useState(["","","","","",""]);
    const [demoOtp,       setDemoOtp]       = useState("");
    const [otpError,      setOtpError]      = useState("");
    const [otpVerified,   setOtpVerified]   = useState(false);
    const [resendTimer,   setResendTimer]   = useState(0);
    const [newPassword,   setNewPassword]   = useState("");
    const [confirmPw,     setConfirmPw]     = useState("");
    const [showPw,        setShowPw]        = useState(false);
    const [showCPw,       setShowCPw]       = useState(false);
    const [pwError,       setPwError]       = useState("");
    const [message,       setMessage]       = useState({ text: "", type: "" });

    const otpRefs = useRef([]);
    const timerRef = useRef(null);

    useEffect(() => () => clearInterval(timerRef.current), []);

    function startCountdown() {
        setResendTimer(30);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setResendTimer((t) => {
                if (t <= 1) { clearInterval(timerRef.current); return 0; }
                return t - 1;
            });
        }, 1000);
    }

    /* Step 1 — email */
    function handleSendOtp() {
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError("Please enter a valid registered email address.");
            return;
        }
        if (!emailExists(email)) {
            setEmailError("No account found with this email address.");
            return;
        }
        setEmailError("");
        const { otp } = generateOtp(email);
        setDemoOtp(otp);
        setStep(2);
        startCountdown();
    }

    /* Step 2 — OTP */
    function handleOtpChange(i, val) {
        const digit = val.replace(/\D/g,"").slice(-1);
        const nv = [...otpValues]; nv[i] = digit; setOtpValues(nv); setOtpError("");
        if (digit && i < 5) otpRefs.current[i+1]?.focus();
    }
    function handleOtpKeyDown(i, e) {
        if (e.key === "Backspace" && !otpValues[i] && i > 0) otpRefs.current[i-1]?.focus();
    }
    function handleOtpPaste(e) {
        e.preventDefault();
        const p = e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
        const nv = [...otpValues];
        for (let i = 0; i < p.length; i++) nv[i] = p[i];
        setOtpValues(nv);
    }
    function handleVerifyOtp() {
        const entered = otpValues.join("");
        if (entered.length < 6) { setOtpError("Please enter the complete 6-digit code."); return; }
        const r = verifyOtp(email, entered);
        if (r.success) { setOtpVerified(true); setDemoOtp(""); setStep(3); }
        else setOtpError(r.error);
    }
    function handleResend() {
        const { otp } = generateOtp(email);
        setDemoOtp(otp);
        setOtpValues(["","","","","",""]);
        setOtpError("");
        startCountdown();
    }

    /* Step 3 — new password */
    const strength = getPasswordStrength(newPassword);
    function handleResetPassword() {
        if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            setPwError("Password must be 8+ chars with uppercase, lowercase, and a number.");
            return;
        }
        if (newPassword !== confirmPw) { setPwError("Passwords do not match."); return; }
        const r = resetPassword(email, newPassword);
        if (!r.success) { setMessage({ text: r.error, type: "error" }); return; }
        setMessage({ text: "Password reset successful. Please sign in with your new password.", type: "success" });
        setTimeout(() => navigate("login"), 2000);
    }

    return (
        <div className="forgot-page">

            {/* Navbar */}
            <header className="forgot-navbar signup-navbar">
                <button type="button" className="signup-brand-link" onClick={() => navigate("login")} aria-label="ProbNexus">
                    <img src="/logo.png" alt="ProbNexus" className="signup-brand-logo" />
                    <span className="signup-brand-name">ProbNexus</span>
                </button>
                <div className="signup-navbar-actions">
                    <button type="button" className="signup-theme-btn" aria-label="Theme"
                        onClick={() => document.body.classList.toggle("dark-preview")}>☼</button>
                </div>
            </header>

            <main className="forgot-hero">

                <div className="forgot-card">
                    <div className="forgot-card-inner">

                        {/* Header */}
                        <div className="forgot-card-header">
                            <img src="/logo.png" alt="ProbNexus" className="forgot-card-logo" />
                            <h2>Password Recovery</h2>
                            <p>SECURE IDENTITY VERIFICATION</p>
                        </div>

                        {/* Step 1 — Email */}
                        {step === 1 && (
                            <div className="signup-form">
                                <span className="form-section-label">REGISTERED EMAIL</span>
                                <div className={`su-input-wrapper ${emailError ? "error-field" : ""}`}>
                                    <span className="su-input-icon"><IconMail /></span>
                                    <input
                                        type="email"
                                        placeholder="Enter your registered email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                                        id="forgot-email"
                                        autoComplete="email"
                                    />
                                </div>
                                {emailError && <p className="field-error">{emailError}</p>}
                                <button type="button" className="su-primary-btn" style={{ marginTop: "12px" }} onClick={handleSendOtp}>
                                    <span>Send Verification Code</span>
                                    <IconArrow />
                                </button>
                                <div className="back-to-login" style={{ marginTop: "14px" }}>
                                    <button type="button" onClick={() => navigate("login")}>
                                        <IconArrowLeft size={13} style={{ verticalAlign: "middle" }} /> Back to Login
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2 — OTP */}
                        {step === 2 && (
                            <div className="signup-form">
                                <div className="otp-header">
                                    <h3>Verify Your Identity</h3>
                                    <p>We&apos;ve sent a code to <span className="otp-email-highlight">{email}</span></p>
                                </div>
                                {demoOtp && (
                                    <div className="demo-otp-banner">
                                        <strong>⚠ DEMO MODE</strong> — Your code:
                                        <span className="demo-otp-code">{demoOtp}</span>
                                    </div>
                                )}
                                <div className="otp-boxes" onPaste={handleOtpPaste}>
                                    {otpValues.map((v, i) => (
                                        <input key={i} ref={(el) => (otpRefs.current[i] = el)}
                                            className={`otp-box ${v ? "filled" : ""}`}
                                            type="text" inputMode="numeric" maxLength={1}
                                            value={v}
                                            onChange={(e) => handleOtpChange(i, e.target.value)}
                                            onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                            aria-label={`Code digit ${i+1}`} id={`fp-otp-${i}`} />
                                    ))}
                                </div>
                                {otpError && <p className="field-error" style={{ textAlign: "center" }}>{otpError}</p>}
                                <button type="button" className="su-primary-btn"
                                    onClick={handleVerifyOtp}
                                    disabled={otpValues.join("").length < 6}>
                                    <span>Verify Code</span><IconCheck />
                                </button>
                                <div className="otp-resend">
                                    {resendTimer > 0 ? <span>Resend in {resendTimer}s</span>
                                        : <><span>Didn&apos;t receive it? </span><button type="button" onClick={handleResend}>Resend</button></>}
                                </div>
                            </div>
                        )}

                        {/* Step 3 — New Password */}
                        {step === 3 && (
                            <form className="signup-form" onSubmit={(e) => { e.preventDefault(); handleResetPassword(); }} noValidate>
                                <span className="form-section-label">SET NEW PASSWORD</span>

                                <div className="su-input-wrapper">
                                    <span className="su-input-icon"><IconLock /></span>
                                    <input type={showPw ? "text" : "password"} placeholder="New Password"
                                        value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setPwError(""); }}
                                        autoComplete="new-password" id="fp-newpw" />
                                    <button type="button" className="su-pw-toggle" onClick={() => setShowPw(!showPw)}>
                                        {showPw ? <IconEyeOff /> : <IconEye />}
                                    </button>
                                </div>

                                {newPassword && (
                                    <>
                                        <div className="password-strength-bar">
                                            <div className={`strength-segment ${strength}`} />
                                            <div className={`strength-segment ${strength === "medium" || strength === "strong" ? strength : ""}`} />
                                            <div className={`strength-segment ${strength === "strong" ? strength : ""}`} />
                                        </div>
                                        <p className={`strength-label ${strength}`}>{strength.charAt(0).toUpperCase() + strength.slice(1)}</p>
                                    </>
                                )}

                                <div className={`su-input-wrapper ${pwError === "Passwords do not match." ? "error-field" : ""}`}>
                                    <span className="su-input-icon"><IconLock /></span>
                                    <input type={showCPw ? "text" : "password"} placeholder="Confirm New Password"
                                        value={confirmPw} onChange={(e) => { setConfirmPw(e.target.value); setPwError(""); }}
                                        autoComplete="new-password" id="fp-confirmpw" />
                                    <button type="button" className="su-pw-toggle" onClick={() => setShowCPw(!showCPw)}>
                                        {showCPw ? <IconEyeOff /> : <IconEye />}
                                    </button>
                                </div>

                                {pwError && <p className="field-error">{pwError}</p>}
                                {message.text && <div className={`su-message ${message.type}`}>{message.text}</div>}

                                <button type="submit" className="su-primary-btn" style={{ marginTop: "14px" }}
                                    disabled={!newPassword || !confirmPw || strength === "weak"}>
                                    <span>Reset Password</span><IconArrow />
                                </button>
                            </form>
                        )}

                    </div>
                </div>

            </main>

            <footer className="forgot-footer">
                <div className="forgot-footer-brand">
                    <span className="forgot-footer-name">ProbNexus</span>
                </div>
                <span className="forgot-footer-tagline">JUSTICE THROUGH INTELLIGENCE</span>
            </footer>

        </div>
    );
}
