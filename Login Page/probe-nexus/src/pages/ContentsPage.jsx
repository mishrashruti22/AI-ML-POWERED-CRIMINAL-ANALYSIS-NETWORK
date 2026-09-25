import "../styles/contents.css";
import "../styles/signup.css"; /* user-menu styles */
import UserMenu from "../components/UserMenu";

export default function ContentsPage({ onNavigate, currentUser }) {
    const navigate = (p) => { if (onNavigate) onNavigate(p); };

    const navLinks = [
        { label: "About", page: "about" },
        { label: "Features", page: "features" },
        { label: "How It Works", page: "how-it-works" },
        { label: "Dashboard", page: "dashboard" },
        { label: "Network Analysis", page: "network-analysis" },
        { label: "Contents", page: "contents" },
    ];

    const categories = [
        {
            num: "01",
            title: "Platform Overview",
            items: [
                { title: "What is ProbNexus?", desc: "Introduction to the criminal network analysis platform." },
                { title: "System Architecture", desc: "Technical overview of the ProbNexus backend and AI pipeline." },
                { title: "Data Privacy & Security", desc: "How ProbNexus handles sensitive investigative data." },
                { title: "User Roles & Permissions", desc: "Investigator, Analyst, and Admin access controls." },
            ],
        },
        {
            num: "02",
            title: "Investigation Workflows",
            items: [
                { title: "Creating a New Case", desc: "Step-by-step guide to opening an investigation in ProbNexus." },
                { title: "Ingesting Data Sources", desc: "How to import case files, financial records, and surveillance data." },
                { title: "Network Graph Navigation", desc: "Exploring connection maps and relationship clusters." },
                { title: "Flagging & Annotating Nodes", desc: "Marking suspects and adding investigator notes." },
            ],
        },
        {
            num: "03",
            title: "AI & Analytics",
            items: [
                { title: "Pattern Detection Models", desc: "How ML algorithms identify anomalous network behaviour." },
                { title: "Risk Score Calculation", desc: "Understanding how nodes and clusters are prioritised." },
                { title: "Temporal Analysis", desc: "Tracking how networks evolve over time." },
                { title: "Entity Resolution", desc: "How aliases and duplicate identities are resolved." },
            ],
        },
        {
            num: "04",
            title: "Reports & Export",
            items: [
                { title: "Generating Intelligence Reports", desc: "Creating court-ready analysis documents." },
                { title: "Exporting Network Graphs", desc: "Download connection maps as SVG or PDF." },
                { title: "Case Summary Export", desc: "Compile full investigation timelines for review." },
                { title: "Audit Trail", desc: "Reviewing investigator activity logs." },
            ],
        },
    ];

    return (
        <div className="contents-page">

            {/* Navbar */}
            <header className="about-navbar">
                <div className="about-brand" onClick={() => navigate("about")} style={{ cursor: "pointer" }}>
                    <img src="/logo.png" alt="ProbNexus" className="about-logo" />
                    <span className="about-brand-name">ProbNexus</span>
                </div>
                <nav className="about-nav">
                    {navLinks.map((l) => (
                        <button key={l.page}
                            className={`about-nav-link ${l.page === "contents" ? "active" : ""}`}
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
            <section className="contents-hero">
                <div className="contents-hero-label">
                    <span>PLATFORM CONTENTS</span>
                    <span className="contents-label-line" />
                </div>
                <h1>What&apos;s<br /><span>Inside.</span></h1>
                <p>A complete index of ProbNexus capabilities, workflows, and documentation.</p>
            </section>

            {/* Contents body */}
            <div className="contents-body">
                {categories.map((cat) => (
                    <div key={cat.num} className="contents-category">
                        <div className="contents-cat-header">
                            <span className="contents-cat-num">{cat.num}</span>
                            <h2>{cat.title}</h2>
                        </div>
                        <div className="contents-items">
                            {cat.items.map((item) => (
                                <div key={item.title} className="contents-item">
                                    <span className="contents-item-dot" />
                                    <div className="contents-item-text">
                                        <h4>{item.title}</h4>
                                        <p>{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <footer className="contents-footer">
                <div className="ct-footer-brand">
                    <img src="/logo.png" alt="ProbNexus" className="ct-footer-logo" />
                    <span className="ct-footer-name">ProbNexus</span>
                </div>
                <span className="ct-footer-right">JUSTICE THROUGH INTELLIGENCE</span>
            </footer>

        </div>
    );
}
