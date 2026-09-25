/*
 * ============================================================
 * PROBNEXUS — AUTH SERVICE (MOCK / FRONTEND PROTOTYPE)
 * ============================================================
 *
 * This module centralises all authentication logic for the
 * frontend prototype.  When a real backend is integrated, only
 * this file needs to be updated — all UI components call these
 * functions and will automatically work with the real API.
 *
 * FUTURE BACKEND ENDPOINTS:
 *   POST /api/auth/register
 *   POST /api/auth/send-otp
 *   POST /api/auth/verify-otp
 *   POST /api/auth/login
 *   POST /api/auth/logout
 *   POST /api/auth/forgot-password
 *   POST /api/auth/reset-password
 *
 * FUTURE DATABASE USER SCHEMA:
 *   {
 *     id:            string (UUID),
 *     fullName:      string,
 *     departmentId:  string,   // e.g. "ABC20"
 *     role:          string,   // investigator | analyst | admin
 *     email:         string,
 *     passwordHash:  string,   // bcrypt — NEVER plain text in production
 *     emailVerified: boolean,
 *     createdAt:     Date,
 *     updatedAt:     Date,
 *   }
 *
 * ⚠️  SECURITY NOTICE:
 *   Passwords here are stored as plain text in localStorage.
 *   This is ONLY acceptable for a frontend demo / prototype.
 *   In production:
 *     - Hash passwords on the server with bcrypt / argon2.
 *     - Use JWT or HttpOnly session cookies for auth state.
 *     - Never store credentials in localStorage.
 * ============================================================
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const STORAGE_KEYS = {
    USERS:        "probnexus_users",       // registered user records
    AUTH:         "probnexus_auth",        // "true" when logged in
    CURRENT_USER: "probnexus_current_user", // serialised user object
    TOKEN:        "token"                  // JWT Bearer token
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function _getUsers() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || "[]");
    } catch {
        return [];
    }
}

function _saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register a new user with the backend or local store.
 */
export async function registerUser({ fullName, departmentId, role, email, password }) {
    try {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName,
                departmentId: departmentId.toUpperCase(),
                email: email.toLowerCase(),
                password,
                confirmPassword: password
            })
        });
        const data = await res.json();
        if (res.ok) {
            return { success: true, user: data.user };
        }
        return { success: false, error: data.error || "Registration failed." };
    } catch (err) {
        console.warn("Backend registration unreachable, using local store:", err);
        const users = _getUsers();
        if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
            return { success: false, error: "An account with this email already exists." };
        }
        if (users.some((u) => u.departmentId.toUpperCase() === departmentId.toUpperCase())) {
            return { success: false, error: "This Department ID is already registered." };
        }
        const newUser = {
            id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
            fullName,
            departmentId: departmentId.toUpperCase(),
            role,
            email: email.toLowerCase(),
            password,
            emailVerified: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        users.push(newUser);
        _saveUsers(users);
        return { success: true };
    }
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

/**
 * Authenticate with email + password using backend JWT API.
 */
export async function loginWithEmail(email, password) {
    try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email.trim(), password })
        });
        const data = await res.json();
        if (res.ok && data.token) {
            setSession(data.user, data.token);
            return { success: true, user: data.user, token: data.token };
        }
        return { success: false, error: data.error || "Invalid email or password." };
    } catch (err) {
        console.warn("Backend login failed, checking fallback:", err);
        const users = _getUsers();
        const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (!user) return { success: false, error: "No account found with this email address." };
        if (user.password !== password) return { success: false, error: "Invalid email or password." };
        setSession(user);
        return { success: true, user };
    }
}

/**
 * Authenticate with Department ID + password using backend JWT API.
 */
export async function loginWithDeptId(departmentId, password) {
    try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ departmentId: departmentId.trim().toUpperCase(), password })
        });
        const data = await res.json();
        if (res.ok && data.token) {
            setSession(data.user, data.token);
            return { success: true, user: data.user, token: data.token };
        }
        return { success: false, error: data.error || "Invalid Department ID or password." };
    } catch (err) {
        console.warn("Backend login failed, checking fallback:", err);
        const users = _getUsers();
        const user = users.find((u) => u.departmentId.toUpperCase() === departmentId.toUpperCase());
        if (!user) return { success: false, error: "No account found with this Department ID." };
        if (user.password !== password) return { success: false, error: "Invalid Department ID or password." };
        setSession(user);
        return { success: true, user };
    }
}

/**
 * Update a user's password (for forgot-password flow).
 */
export function resetPassword(email, newPassword) {
    const users = _getUsers();
    const idx   = users.findIndex((u) => u.email.toLowerCase() === email.toLowerCase());
    if (idx === -1) {
        return { success: false, error: "Email address not found." };
    }
    users[idx].password  = newPassword;
    users[idx].updatedAt = new Date().toISOString();
    _saveUsers(users);
    return { success: true };
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

/**
 * Persist an authenticated session and store the JWT token.
 */
export function setSession(user, token) {
    const safeUser = { ...user };
    delete safeUser.password;
    delete safeUser.passwordHash;
    localStorage.setItem(STORAGE_KEYS.AUTH, "true");
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(safeUser));
    if (token) {
        localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        localStorage.setItem("probnexus_token", token);
    }
}

/**
 * Retrieve the JWT auth token.
 */
export function getToken() {
    return localStorage.getItem(STORAGE_KEYS.TOKEN) || localStorage.getItem("probnexus_token") || null;
}

/**
 * Retrieve the current session user.
 */
export function getSession() {
    if (localStorage.getItem(STORAGE_KEYS.AUTH) !== "true") return null;
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
    } catch {
        return null;
    }
}

/**
 * Check whether the user is authenticated.
 */
export function isAuthenticated() {
    return localStorage.getItem(STORAGE_KEYS.AUTH) === "true";
}

/**
 * Clear the session (logout).
 */
export function clearSession() {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem("probnexus_token");
}

// ---------------------------------------------------------------------------
// OTP (mock implementation)
// ---------------------------------------------------------------------------

const OTP_STORAGE_KEY = "probnexus_otp";

/**
 * Generate and "send" a 6-digit OTP.
 *
 * In production this becomes:
 *   POST /api/auth/send-otp
 *   body: { email }
 *   — the server generates the OTP and sends it via email service.
 *
 * For the prototype the OTP is returned directly so the UI can
 * display it in a developer/demo banner.
 *
 * @param {string} email
 * @returns {{ otp: string, expiresAt: number }}
 */
export function generateOtp(email) {
    const otp       = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store temporarily — in production this lives server-side
    localStorage.setItem(
        OTP_STORAGE_KEY,
        JSON.stringify({ email: email.toLowerCase(), otp, expiresAt })
    );

    console.log(`[ProbNexus DEV] OTP for ${email}: ${otp}`);

    return { otp, expiresAt };
}

/**
 * Verify an OTP submitted by the user.
 *
 * In production this becomes:
 *   POST /api/auth/verify-otp
 *   body: { email, otp }
 *
 * @returns {{ success: boolean, error?: string }}
 */
export function verifyOtp(email, enteredOtp) {
    try {
        const stored = JSON.parse(localStorage.getItem(OTP_STORAGE_KEY) || "null");
        if (!stored) return { success: false, error: "No pending verification found." };
        if (stored.email !== email.toLowerCase()) {
            return { success: false, error: "Email mismatch. Please restart verification." };
        }
        if (Date.now() > stored.expiresAt) {
            localStorage.removeItem(OTP_STORAGE_KEY);
            return { success: false, error: "This verification code has expired. Please request a new code." };
        }
        if (stored.otp !== enteredOtp.trim()) {
            return { success: false, error: "Invalid verification code. Please try again." };
        }
        localStorage.removeItem(OTP_STORAGE_KEY);
        return { success: true };
    } catch {
        return { success: false, error: "Verification failed. Please try again." };
    }
}

/**
 * Check whether a given email is already registered.
 * Useful for the forgot-password flow.
 */
export function emailExists(email) {
    const users = _getUsers();
    return users.some((u) => u.email.toLowerCase() === email.toLowerCase());
}
