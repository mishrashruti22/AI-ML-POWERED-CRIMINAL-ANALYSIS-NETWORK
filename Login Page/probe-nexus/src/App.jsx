/*
 * ============================================================
 * PROBNEXUS — APP.JSX
 * State-based router with authentication guard.
 *
 * Page states:
 *   Public:    "login" | "signup" | "forgot-password"
 *   Protected: "about" | "home" | "features" | "how-it-works"
 *              "dashboard" | "contents"
 *
 * Authentication:
 *   Checked via authService.isAuthenticated() (localStorage).
 *   When backend is integrated, only authService.js changes.
 * ============================================================
 */

import { useState } from "react";
import { isAuthenticated, getSession } from "./auth/authService";

/* ── Public pages ── */
import LoginPage         from "./pages/LoginPage.jsx";
import SignupPage        from "./pages/SignupPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";

/* ── Protected pages ── */
import AboutPage         from "./pages/AboutPage.jsx";
import FeaturesPage      from "./pages/FeaturesPage.jsx";
import HowItWorksPage    from "./pages/HowItWorksPage.jsx";
import DashboardPage     from "./pages/DashboardPage.jsx";
import NetworkAnalysisPage from "./pages/NetworkAnalysisPage.jsx";
import ContentsPage      from "./pages/ContentsPage.jsx";
import UserManagementPage from "./pages/UserManagementPage.jsx";
import CaseBuilderPage   from "./pages/CaseBuilderPage.jsx";

/* ── Auth guard ── */
import ProtectedRoute    from "./components/ProtectedRoute.jsx";

/* ── Protected page names ── */
const PROTECTED_PAGES = new Set([
    "home", "about", "features", "how-it-works",
    "dashboard", "network-analysis", "contents", "user-management", "case-builder",
]);

/* ── Public page names ── */
const PUBLIC_PAGES = new Set(["login", "signup", "forgot-password"]);

/* ================================================================
   DETERMINE INITIAL PAGE
   On first load: if user is already authenticated → "about"
                  otherwise → "login"
================================================================ */
function getInitialPage() {
    if (isAuthenticated()) return "about";
    return "login";
}

/* ================================================================
   APP
================================================================ */
function App() {

    const [page,        setPage]        = useState(getInitialPage);
    const [currentUser, setCurrentUser] = useState(() => getSession());
    const [activeCaseId, setActiveCaseId] = useState("PNX-2026-001");

    /*
     * Navigation handler — used by all pages via onNavigate prop.
     * Applies auth guard: if an unauthenticated user tries to
     * navigate to a protected page, redirect to login.
     */
    function handleNavigate(targetPage, optionalCaseId) {
        if (optionalCaseId) {
            setActiveCaseId(optionalCaseId);
        }
        if (PROTECTED_PAGES.has(targetPage) && !isAuthenticated()) {
            setPage("login");
            return;
        }
        setPage(targetPage);
    }

    /*
     * Called by the Login component on successful authentication.
     * Strict requirement: redirect to "about", NOT "dashboard".
     */
    function handleLoginSuccess(user) {
        setCurrentUser(user);
        setPage("about");
    }

    /*
     * Login fallback rendered by ProtectedRoute when not authenticated.
     */
    const loginFallback = (
        <LoginPage
            onNavigate={handleNavigate}
            onLoginSuccess={handleLoginSuccess}
        />
    );

    /* ── Shared props for all protected pages ── */
    const protectedProps = {
        onNavigate:  handleNavigate,
        currentUser,
        selectedCaseId: activeCaseId,
        onSelectCase: setActiveCaseId
    };

    /* ================================================================
       PUBLIC PAGES (no auth required)
    ================================================================ */

    if (page === "login") {
        return (
            <LoginPage
                onNavigate={handleNavigate}
                onLoginSuccess={handleLoginSuccess}
            />
        );
    }

    if (page === "signup") {
        return <SignupPage onNavigate={handleNavigate} />;
    }

    if (page === "forgot-password") {
        return <ForgotPasswordPage onNavigate={handleNavigate} />;
    }

    /* ================================================================
       PROTECTED PAGES
       ProtectedRoute renders loginFallback if not authenticated.
    ================================================================ */

    /* "home" navigates to about — treat as alias */
    if (page === "home") {
        return (
            <ProtectedRoute fallback={loginFallback}>
                <AboutPage {...protectedProps} />
            </ProtectedRoute>
        );
    }

    if (page === "about") {
        return (
            <ProtectedRoute fallback={loginFallback}>
                <AboutPage {...protectedProps} />
            </ProtectedRoute>
        );
    }

    if (page === "features") {
        return (
            <ProtectedRoute fallback={loginFallback}>
                <FeaturesPage {...protectedProps} />
            </ProtectedRoute>
        );
    }

    if (page === "how-it-works") {
        return (
            <ProtectedRoute fallback={loginFallback}>
                <HowItWorksPage {...protectedProps} />
            </ProtectedRoute>
        );
    }

    if (page === "dashboard") {
        return (
            <ProtectedRoute fallback={loginFallback}>
                <DashboardPage {...protectedProps} />
            </ProtectedRoute>
        );
    }

    if (page === "network-analysis") {
        return (
            <ProtectedRoute fallback={loginFallback}>
                <NetworkAnalysisPage {...protectedProps} />
            </ProtectedRoute>
        );
    }

    if (page === "contents") {
        return (
            <ProtectedRoute fallback={loginFallback}>
                <ContentsPage {...protectedProps} />
            </ProtectedRoute>
        );
    }

    if (page === "user-management") {
        return (
            <ProtectedRoute fallback={loginFallback}>
                <UserManagementPage {...protectedProps} />
            </ProtectedRoute>
        );
    }

    if (page === "case-builder") {
        return (
            <ProtectedRoute fallback={loginFallback}>
                <CaseBuilderPage
                    {...protectedProps}
                    onCaseCreated={(newId) => {
                        setActiveCaseId(newId);
                        setPage("network-analysis");
                    }}
                />
            </ProtectedRoute>
        );
    }

    /* ── Fallback: any unknown page → login ── */
    return (
        <LoginPage
            onNavigate={handleNavigate}
            onLoginSuccess={handleLoginSuccess}
        />
    );
}

export default App;