import "../styles/dashboard.css";
import "../styles/signup.css"; /* user-menu styles */
import UserMenu from "../components/UserMenu";

export default function DashboardPage({ onNavigate, currentUser }) {
    const navigate = (p) => { if (onNavigate) onNavigate(p); };

    const navLinks = [
        { label: "About", page: "about" },
        { label: "Features", page: "features" },
        { label: "How It Works", page: "how-it-works" },
        { label: "Dashboard", page: "dashboard" },
        { label: "Network Analysis", page: "network-analysis" },
        { label: "Contents", page: "contents" },
    ];

    const modules = [
        { icon: "⌘", title: "Network Graph", desc: "Visualise criminal network connections and relationship clusters.", status: "ACTIVE", page: "network-analysis" },
        { icon: "✺", title: "AI Insight Engine", desc: "ML-powered pattern detection across ingested investigation data.", status: "ACTIVE", page: "network-analysis" },
        { icon: "▤", title: "Data Sources & Ingestion", desc: "Ingest FIRs, CDR calls, and financial transactions for dynamic network generation.", status: "ACTIVE", page: "case-builder" },
        { icon: "♢", title: "Risk Scoring", desc: "Automated risk score computation for flagged network nodes.", status: "ACTIVE", page: "network-analysis" },
        { icon: "◎", title: "Case Builder & Ingestion", desc: "Create live cases, ingest evidence records, and trigger AI analysis.", status: "ACTIVE", page: "case-builder" },
        { icon: "⊞", title: "Report Generator", desc: "Generate court-ready intelligence reports from network analysis.", status: "COMING SOON" },
    ];

    return (
        <div className="dashboard-page">

            {/* Navbar */}
            <header className="about-navbar">
                <div className="about-brand" onClick={() => navigate("about")} style={{ cursor: "pointer" }}>
                    <img src="/logo.png" alt="ProbNexus" className="about-logo" />
                    <span className="about-brand-name">ProbNexus</span>
                </div>
                <nav className="about-nav">
                    {navLinks.map((l) => (
                        <button key={l.page}
                            className={`about-nav-link ${l.page === "dashboard" ? "active" : ""}`}
                            onClick={() => navigate(l.page)}>
                            {l.label}
                        </button>
                    ))}
                </nav>
                <div className="about-nav-actions">
                    <button className="theme-button" onClick={() => document.body.classList.toggle("dark-mode")} aria-label="Theme">☼</button>
                    <div className="nav-divider" />
                    <UserMenu user={currentUser} onNavigate={navigate} />
                </div>
            </header>

            {/* Hero */}
            <section className="dashboard-hero">
                <div className="dashboard-hero-label">
                    <span>INVESTIGATION DASHBOARD</span>
                    <span className="db-label-line" />
                </div>
                <h1>Analysis<br /><span>Command Centre.</span></h1>
                <p>Your central hub for criminal network analysis, AI-powered insights, and investigative workflows.</p>
            </section>

            {/* Stats */}
            <div className="dashboard-stats">
                <div className="dashboard-stat">
                    <span className="stat-value">1<span>,</span>000<span>+</span></span>
                    <span className="stat-label">Data Sources</span>
                </div>
                <div className="dashboard-stat">
                    <span className="stat-value">5<span>,</span>000<span>+</span></span>
                    <span className="stat-label">Cases Analysed</span>
                </div>
                <div className="dashboard-stat">
                    <span className="stat-value">99<span>%</span></span>
                    <span className="stat-label">Pattern Accuracy</span>
                </div>
                <div className="dashboard-stat">
                    <span className="stat-value">24<span>/</span>7</span>
                    <span className="stat-label">Investigation Support</span>
                </div>
            </div>

            {/* Modules */}
            <div className="dashboard-body">
                <div className="dashboard-section-head">
                    <h2>Investigation Modules</h2>
                    <div className="dashboard-section-line" />
                </div>

                <div className="dashboard-modules">
                    {modules.map((m) => (
                        <div
                            key={m.title}
                            className={`dashboard-module ${m.page ? "clickable-module" : ""}`}
                            onClick={() => { if (m.page) navigate(m.page); }}
                            style={{ cursor: m.page ? "pointer" : "default" }}
                        >
                            <div className="module-icon">{m.icon}</div>
                            <h3>{m.title}</h3>
                            <p>{m.desc}</p>
                            <span className="module-status">{m.status}</span>
                        </div>
                    ))}
                </div>

                <div className="coming-soon-notice">
                    ⚠&nbsp;&nbsp;<span><strong>Prototype Notice:</strong> Full dashboard functionality will be available once the backend and AI models are integrated. Module interfaces are placeholders for the current frontend build.</span>
                </div>
            </div>

            {/* Footer */}
            <footer className="dashboard-footer">
                <div className="db-footer-brand">
                    <img src="/logo.png" alt="ProbNexus" className="db-footer-logo" />
                    <span className="db-footer-name">ProbNexus</span>
                </div>
                <span className="db-footer-right">JUSTICE THROUGH INTELLIGENCE</span>
            </footer>

        </div>
    );
}
