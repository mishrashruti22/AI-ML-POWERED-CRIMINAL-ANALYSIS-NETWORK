import React from "react";
import "../styles/about.css";
import "../styles/signup.css"; /* provides user-menu styles */
import UserMenu from "../components/UserMenu";

function AboutPage({ onNavigate, currentUser }) {
    const navigate = (page) => {
        if (onNavigate) {
            onNavigate(page);
        }
    };

    const navLinks = [
        { label: "About", page: "about", active: true },
        { label: "Features", page: "features", active: false },
        { label: "How It Works", page: "how-it-works", active: false },
        { label: "Dashboard", page: "dashboard", active: false },
        { label: "Network Analysis", page: "network-analysis", active: false },
        { label: "Contents", page: "contents", active: false },
    ];

    return (
        <div className="about-page">

            {/* =====================================================
          HEADER / NAVBAR
      ====================================================== */}
            <header className="about-navbar">

                {/* LOGO */}
                <div
                    className="about-brand"
                    onClick={() => navigate("about")}
                    style={{ cursor: "pointer" }}
                >
                    <img
                        src="/logo.png"
                        alt="ProbNexus Logo"
                        className="about-logo"
                    />

                    <span className="about-brand-name">
                        ProbNexus
                    </span>
                </div>

                {/* NAVIGATION */}
                <nav className="about-nav">
                    {navLinks.map((link) => (
                        <button
                            key={link.page}
                            onClick={() => navigate(link.page)}
                            className={`about-nav-link ${link.active ? "active" : ""}`}
                        >
                            {link.label}
                        </button>
                    ))}
                </nav>

                {/* RIGHT SIDE */}
                <div className="about-nav-actions">

                    <button
                        className="theme-button"
                        aria-label="Toggle theme"
                        onClick={() => {
                            document.body.classList.toggle("dark-mode");
                        }}
                    >
                        ☼
                    </button>

                    <div className="nav-divider" />

                    {/* User profile menu with logout */}
                    <UserMenu user={currentUser} onNavigate={navigate} />

                </div>

            </header>


            {/* =====================================================
          HERO SECTION
      ====================================================== */}
            <section className="about-hero">

                <div className="about-hero-overlay" />

                <div className="about-hero-content">

                    <div className="about-hero-left">

                        <div className="section-label">
                            <span>ABOUT US</span>
                            <span className="label-line" />
                        </div>

                        <h1>
                            Turning Data Into
                            <br />
                            <span>Real Connections.</span>
                        </h1>

                        <p>
                            ProbNexus is an AI-powered criminal network analysis
                            platform designed to help investigators uncover hidden
                            links, patterns and people behind crime.
                        </p>

                        <div className="hero-small-line" />

                    </div>

                </div>

            </section>


            {/* =====================================================
          MAIN ABOUT CONTENT
      ====================================================== */}
            <section className="about-main">

                {/* =================================================
            MISSION
        ================================================== */}
                <div className="about-column mission-column">

                    <div className="section-label">
                        <span>OUR MISSION</span>
                        <span className="label-line" />
                    </div>

                    <h2>
                        Smarter Analysis.
                        <br />
                        <span>Safer Communities.</span>
                    </h2>

                    <p className="about-description">
                        We aim to empower law enforcement agencies with
                        intelligent tools that can analyze complex criminal
                        networks, reveal hidden relationships and support
                        faster, more accurate investigations.
                    </p>

                    <div className="mission-tag">

                        <div className="mission-target">
                            <span className="target-outer" />
                            <span className="target-inner" />
                            <span className="target-dot" />
                        </div>

                        <span>
                            Smarter tools. Stronger justice.
                        </span>

                    </div>

                </div>


                {/* =================================================
            WHAT WE DO
        ================================================== */}
                <div className="about-column what-we-do-column">

                    <div className="section-label">
                        <span>WHAT WE DO</span>
                        <span className="label-line" />
                    </div>


                    <div className="service-list">

                        {/* SERVICE 1 */}
                        <div className="service-item">

                            <div className="service-icon network-icon">
                                <span>⌘</span>
                            </div>

                            <div className="service-content">

                                <h3>
                                    Network Detection
                                </h3>

                                <p>
                                    Find and visualize hidden connections
                                    between people, places and events.
                                </p>

                            </div>

                        </div>


                        {/* SERVICE 2 */}
                        <div className="service-item">

                            <div className="service-icon">
                                <span>✺</span>
                            </div>

                            <div className="service-content">

                                <h3>
                                    AI-Powered Insights
                                </h3>

                                <p>
                                    Use machine learning to detect patterns,
                                    anomalies and high-risk links.
                                </p>

                            </div>

                        </div>


                        {/* SERVICE 3 */}
                        <div className="service-item">

                            <div className="service-icon">
                                <span>▤</span>
                            </div>

                            <div className="service-content">

                                <h3>
                                    Multiple Data Sources
                                </h3>

                                <p>
                                    Integrate data from diverse sources like
                                    case files, surveillance, financial records
                                    and more.
                                </p>

                            </div>

                        </div>


                        {/* SERVICE 4 */}
                        <div className="service-item">

                            <div className="service-icon">
                                <span>♢</span>
                            </div>

                            <div className="service-content">

                                <h3>
                                    Actionable Intelligence
                                </h3>

                                <p>
                                    Turn complex data into clear, visual
                                    insights for faster, informed decisions.
                                </p>

                            </div>

                        </div>

                    </div>

                </div>


                {/* =================================================
            VISION
        ================================================== */}
                <div className="about-column vision-column">

                    <div className="section-label">
                        <span>OUR VISION</span>
                        <span className="label-line" />
                    </div>

                    <h2>
                        A Future Where
                        <br />
                        Criminal Networks
                        <br />
                        <span>Don&apos;t Stay Hidden.</span>
                    </h2>

                    <p className="about-description">
                        We envision a world where technology helps
                        uncover the truth — connecting the dots,
                        stopping crime and making communities safer.
                    </p>

                    <div className="vision-line" />

                    <div className="vision-signature">
                        Real Data.
                        <br />
                        Real Impact.
                    </div>

                </div>

            </section>


            {/* =====================================================
          FOOTER
      ====================================================== */}
            <footer className="about-footer">

                <div className="footer-left">

                    <div className="footer-brand">

                        <img
                            src="/logo.png"
                            alt="ProbNexus"
                            className="footer-logo"
                        />

                        <span className="footer-name">
                            ProbNexus
                        </span>

                    </div>

                </div>


                {/* STATISTICS */}
                <div className="footer-stats">

                    <div className="footer-stat">
                        <strong>1000+</strong>
                        <span>Data Sources</span>
                    </div>

                    <div className="footer-stat">
                        <strong>5000+</strong>
                        <span>Cases Analyzed</span>
                    </div>

                    <div className="footer-stat">
                        <strong>99%</strong>
                        <span>Pattern Accuracy</span>
                    </div>

                    <div className="footer-stat">
                        <strong>24/7</strong>
                        <span>Investigation Support</span>
                    </div>

                </div>


                <div className="footer-right">
                    JUSTICE THROUGH INTELLIGENCE
                </div>

            </footer>

        </div>
    );
}

export default AboutPage;