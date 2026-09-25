import { isAuthenticated } from "../auth/authService";

/**
 * ProtectedRoute — wraps any page that requires authentication.
 *
 * If the user is not authenticated, renders the fallback (Login page).
 * Otherwise renders children.
 *
 * Usage in App.jsx:
 *   <ProtectedRoute fallback={<LoginPage onNavigate={setPage} />}>
 *     <AboutPage onNavigate={setPage} currentUser={currentUser} />
 *   </ProtectedRoute>
 *
 * In a React Router setup this would use <Navigate to="/login" replace />.
 * Since we use state-based routing, the fallback prop carries the redirect.
 */
export default function ProtectedRoute({ children, fallback }) {
    if (!isAuthenticated()) {
        return fallback;
    }
    return children;
}
