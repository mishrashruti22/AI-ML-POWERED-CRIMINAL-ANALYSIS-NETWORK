import "../styles/how-it-works.css";
import "../styles/signup.css"; /* user-menu styles */
import UserMenu from "../components/UserMenu";

export default function HowItWorksPage({ onNavigate, currentUser }) {
    const navigate = (p) => { if (onNavigate) onNavigate(p); };

    const steps = [
        {
            num: "01",
            title: "Data Ingestion",
            tag: "COLLECTION",
            body: "ProbNexus ingests structured and unstructured data from diverse sources — case files, surveillance records, financial transactions, telecommunications logs, and open-source intelligence — into a unified investigation workspace."
        },
        {
            num: "02",
            title: "Entity Extraction & Linking",
            tag: "ANALYSIS",
            body: "Our AI models parse ingested data to identify and extract entities — individuals, locations, organisations, events — and automatically resolve duplicates, linking aliases, phone numbers, addresses, and identifiers to canonical records."
        },
        {
            num: "03",
            title: "Network Graph Construction",
            tag: "VISUALISATION",
            body: "Extracted entities and their relationships are projected into a dynamic, interactive network graph. Investigators can explore connection strength, temporal relationships, and cluster memberships at a glance."
        },
        {
            num: "04",
            title: "Pattern Detection & Risk Scoring",
            tag: "AI INTELLIGENCE",
            body: "Machine learning models continuously scan the network for anomalous patterns — unusual communication bursts, financial flow irregularities, and high-risk node configurations — and assign risk scores to prioritise investigative focus."
        },
        {
            num: "05",
            title: "Investigator Workflow",
            tag: "COLLABORATION",
            body: "Analysts can annotate nodes, tag suspects, attach case notes, share intelligence with team members, and generate court-ready reports — all within a secure, audited environment."
        },
    ];

    const navLinks = [
        { label: "About", page: "about" },
        { label: "Features", page: "features" },
        { label: "How It Works", page: "how-it-works" },
        { label: "Dashboard", page: "dashboard" },
        { label: "Network Analysis", page: "network-analysis" },
        { label: "Contents", page: "contents" },
    ];

    return (
        <div className="how-page">

            {/* Navbar */}
            <header className="about-navbar">
                <div className="about-brand" onClick={() => navigate("about")} style={{ cursor: "pointer" }}>
                    <img src="/logo.png" alt="ProbNexus" className="about-logo" />
                    <span className="about-brand-name">ProbNexus</span>
                </div>

                <nav className="about-nav">
                    {navLinks.map((l) => (
                        <button key={l.page}
                            className={`about-nav-link ${l.page === "how-it-works" ? "active" : ""}`}
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
            <section className="how-hero">
                <div className="how-hero-content">
                    <div className="how-section-label">
                        <span>HOW IT WORKS</span>
                        <span className="how-label-line" />
                    </div>
                    <h1>Intelligence,<br /><span>Step by Step.</span></h1>
                    <p>From raw data to actionable insights — the ProbNexus methodology explained.</p>
                </div>
            </section>

            {/* Steps */}
            <section className="how-steps">
                {steps.map((s) => (
                    <div key={s.num} className="how-step">
                        <div className="how-step-number">{s.num}</div>
                        <div className="how-step-body">
                            <h3>{s.title}</h3>
                            <p>{s.body}</p>
                            <span className="how-step-tag">{s.tag}</span>
                        </div>
                    </div>
                ))}
            </section>

            {/* Footer */}
            <footer className="how-footer">
                <div className="how-footer-brand">
                    <img src="/logo.png" alt="ProbNexus" className="how-footer-logo" />
                    <span className="how-footer-name">ProbNexus</span>
                </div>
                <span className="how-footer-right">JUSTICE THROUGH INTELLIGENCE</span>
            </footer>

        </div>
    );
}
