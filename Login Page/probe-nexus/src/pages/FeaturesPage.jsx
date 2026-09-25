import React, { useState } from "react";
import "../styles/features.css";
import "../styles/signup.css"; /* user-menu styles */
import UserMenu from "../components/UserMenu";

function FeaturesPage({ onNavigate, currentUser }) {
    const [darkMode, setDarkMode] = useState(false);

    const toggleTheme = () => {
        setDarkMode(!darkMode);
        document.body.classList.toggle("dark-mode");
    };

    const features = [
        {
            number: "01",
            icon: "network",
            title: "Network Analysis",
            subtitle: "FIND THE CONNECTIONS",
            description:
                "Visualize and analyze complex criminal networks, uncovering hidden links between people, places and events.",
            visual: "network"
        },
        {
            number: "02",
            icon: "brain",
            title: "AI-Powered Insights",
            subtitle: "DETECT WHAT OTHERS MISS",
            description:
                "Our AI models detect patterns, anomalies and high-risk links that manual analysis often overlooks.",
            visual: "ai"
        },
        {
            number: "03",
            icon: "database",
            title: "Multi-Source Data",
            subtitle: "A COMPLETE PICTURE",
            description:
                "Integrate data from diverse sources like case files, surveillance, financial records and more.",
            visual: "data"
        },
        {
            number: "04",
            icon: "shield",
            title: "Actionable Intelligence",
            subtitle: "FROM DATA TO DECISIONS",
            description:
                "Turn complex data into clear, visual insights so investigators can act faster and make informed decisions.",
            visual: "intelligence"
        },
        {
            number: "05",
            icon: "eye",
            title: "Real-Time Monitoring",
            subtitle: "STAY AHEAD",
            description:
                "Track evolving networks and new connections in real time, with instant alerts for suspicious activity and emerging threats.",
            visual: "monitor"
        },
        {
            number: "06",
            icon: "lock",
            title: "Secure & Compliant",
            subtitle: "BUILT FOR TRUST",
            description:
                "Your data stays protected with end-to-end encryption and strict access controls, ensuring privacy and security at every step.",
            visual: "security"
        }
    ];

    return (
        <div className={`features-page ${darkMode ? "features-dark" : ""}`}>

            {/* ================= NAVBAR ================= */}

            <header className="features-navbar">

                <div
                    className="features-brand"
                    onClick={() => onNavigate("about")}
                >
                    <img
                        src="/logo.png"
                        alt="ProbNexus"
                        className="features-logo"
                    />

                    <span className="features-brand-name">
                        ProbNexus
                    </span>
                </div>


                <nav className="features-nav">

                    <button className="features-nav-link" onClick={() => onNavigate("about")}>About</button>
                    <button className="features-nav-link active">Features</button>
                    <button className="features-nav-link" onClick={() => onNavigate("how-it-works")}>How It Works</button>
                    <button className="features-nav-link" onClick={() => onNavigate("dashboard")}>Dashboard</button>
                    <button className="features-nav-link" onClick={() => onNavigate("contents")}>Contents</button>

                </nav>


                <div className="features-nav-actions">

                    <button
                        className="theme-button"
                        onClick={toggleTheme}
                        aria-label="Toggle theme"
                    >
                        ☼
                    </button>

                    <span className="nav-divider"></span>

                    {/* User profile menu with logout */}
                    <UserMenu user={currentUser} onNavigate={onNavigate} />

                </div>

            </header>


            {/* ================= HERO ================= */}

            <section className="features-hero">

                <div className="features-hero-overlay"></div>

                <div className="features-hero-content">

                    <div className="features-hero-left">

                        <div className="features-section-label">
                            <span>FEATURES</span>
                            <span className="features-label-line"></span>
                        </div>


                        <h1>
                            Powerful Tools for
                            <span> Deeper Insights.</span>
                        </h1>


                        <p>
                            ProbNexus combines advanced AI, data intelligence
                            and network analysis to help investigators uncover
                            the truth, faster.
                        </p>


                        <div className="features-hero-line"></div>

                    </div>


                    {/* HERO NETWORK VISUAL */}

                    <div className="hero-network">

                        <div className="hero-network-map"></div>

                        <div className="network-lines">

                            <span className="line l1"></span>
                            <span className="line l2"></span>
                            <span className="line l3"></span>
                            <span className="line l4"></span>
                            <span className="line l5"></span>
                            <span className="line l6"></span>
                            <span className="line l7"></span>

                        </div>


                        <div className="network-center">
                            <div className="center-person">●</div>
                        </div>


                        <div className="network-node node-1">●</div>
                        <div className="network-node node-2">●</div>
                        <div className="network-node node-3">●</div>
                        <div className="network-node node-4">●</div>
                        <div className="network-node node-5">●</div>
                        <div className="network-node node-6">●</div>


                        <div className="hero-analysis-card">
                            <small>Link Strength</small>

                            <div className="strength-bars">
                                <i></i><i></i><i></i><i></i>
                                <i></i><i></i><i></i><i></i>
                                <i></i><i></i><i></i><i></i>
                            </div>

                            <strong>92%</strong>
                        </div>


                        <div className="hero-density-card">

                            <small>Network Density</small>

                            <div className="density-chart">
                                <span></span>
                                <span></span>
                                <span></span>
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>

                            <strong>High</strong>

                        </div>


                        <div className="hero-related-card">
                            <small>Related Entities</small>

                            <div className="related-circles">
                                <span></span>
                                <span></span>
                                <span></span>
                                <b>+12</b>
                            </div>
                        </div>


                        <div className="hero-process">

                            <div>
                                <span className="process-dot active"></span>
                                ANALYZE
                            </div>

                            <div>
                                <span className="process-dot active"></span>
                                CONNECT
                            </div>

                            <div className="selected-process">
                                <span className="process-dot"></span>
                                UNCOVER
                            </div>

                        </div>

                    </div>

                </div>

            </section>


            {/* ================= FEATURE CARDS ================= */}

            <main className="feature-grid">

                {features.map((feature) => (

                    <article
                        className="feature-card"
                        key={feature.number}
                    >

                        <div className="feature-card-content">

                            <div className="feature-card-top">

                                <div className={`feature-icon ${feature.icon}`}>
                                    {feature.icon === "network" && "⌘"}
                                    {feature.icon === "brain" && "♧"}
                                    {feature.icon === "database" && "◎"}
                                    {feature.icon === "shield" && "♢"}
                                    {feature.icon === "eye" && "◉"}
                                    {feature.icon === "lock" && "♙"}
                                </div>

                                <span className="feature-number">
                                    {feature.number}
                                </span>

                            </div>


                            <h2>
                                {feature.title}
                            </h2>


                            <div className="feature-subtitle">
                                {feature.subtitle}
                            </div>


                            <p>
                                {feature.description}
                            </p>


                            <button
                                className="learn-more"
                                onClick={() => {
                                    alert(`${feature.title} selected`);
                                }}
                            >
                                Learn More
                                <span>→</span>
                            </button>

                        </div>


                        {/* CARD VISUAL */}

                        <div className={`feature-visual ${feature.visual}`}>

                            {feature.visual === "network" && (
                                <div className="mini-network">

                                    <span className="mini-center"></span>

                                    <span className="mini-node mn1"></span>
                                    <span className="mini-node mn2"></span>
                                    <span className="mini-node mn3"></span>
                                    <span className="mini-node mn4"></span>
                                    <span className="mini-node mn5"></span>

                                    <i className="mini-line ml1"></i>
                                    <i className="mini-line ml2"></i>
                                    <i className="mini-line ml3"></i>
                                    <i className="mini-line ml4"></i>
                                    <i className="mini-line ml5"></i>

                                    <div className="degree-badge">
                                        <span></span>
                                        3rd Degree Link
                                    </div>

                                </div>
                            )}


                            {feature.visual === "ai" && (
                                <div className="ai-visual">

                                    <div className="ai-head">
                                        <div className="ai-points"></div>
                                    </div>

                                    <div className="ai-alert">
                                        <span></span>
                                        Anomaly Detected
                                    </div>

                                    <div className="ai-alert">
                                        <span></span>
                                        High Risk Link
                                    </div>

                                    <div className="ai-alert muted">
                                        <span></span>
                                        Unusual Pattern
                                    </div>

                                </div>
                            )}


                            {feature.visual === "data" && (
                                <div className="data-stack">

                                    <div className="data-layer layer1">
                                        <span>▤</span>
                                    </div>

                                    <div className="data-layer layer2">
                                        <span>▧</span>
                                    </div>

                                    <div className="data-layer layer3">
                                        <span>▤</span>
                                    </div>

                                    <div className="data-labels">
                                        <span>▣ Case Files</span>
                                        <span>♧ Surveillance</span>
                                        <span>▤ Financial Records</span>
                                        <span>◉ Social Data</span>
                                        <span>▢ Public Records</span>
                                    </div>

                                </div>
                            )}


                            {feature.visual === "intelligence" && (
                                <div className="intelligence-visual">

                                    <div className="radar-circle">
                                        <span className="radar-point"></span>
                                    </div>

                                    <div className="intel-list">

                                        <span>
                                            <b></b>
                                            Key Suspect
                                        </span>

                                        <span>
                                            <b></b>
                                            Possible Location
                                        </span>

                                        <span>
                                            <b></b>
                                            Associated Network
                                        </span>

                                        <span>
                                            <b></b>
                                            Risk Level
                                        </span>

                                    </div>

                                    <div className="risk-badge">
                                        HIGH RISK
                                    </div>

                                </div>
                            )}


                            {feature.visual === "monitor" && (
                                <div className="monitor-visual">

                                    <div className="monitor-alert">
                                        <strong>
                                            ⚠ New Link Detected
                                        </strong>

                                        <small>
                                            3 mins ago
                                        </small>
                                    </div>

                                    <div className="monitor-items">
                                        <span>● New Association</span>
                                        <span>● Location Update</span>
                                        <span>● Pattern Change</span>
                                    </div>

                                    <div className="monitor-chart">
                                        <i></i>
                                        <i></i>
                                        <i></i>
                                        <i></i>
                                        <i></i>
                                        <i></i>
                                        <i></i>
                                        <i></i>
                                    </div>

                                </div>
                            )}


                            {feature.visual === "security" && (
                                <div className="security-visual">

                                    <div className="security-ring">

                                        <div className="security-lock">
                                            ♙
                                        </div>

                                    </div>

                                    <div className="security-badges">
                                        <span>♢ AES-256</span>
                                        <span>♢ GDPR Compliant</span>
                                    </div>

                                </div>
                            )}

                        </div>

                    </article>

                ))}

            </main>


            {/* ================= FOOTER ================= */}

            <footer className="features-footer">

                <div className="features-footer-left">

                    <div className="footer-brand">

                        <img
                            src="/logo.png"
                            alt="ProbNexus"
                            className="footer-logo"
                        />

                        <span>
                            ProbNexus
                        </span>

                    </div>

                    <div className="footer-divider"></div>

                    <p>
                        SMARTER ANALYSIS. SAFER COMMUNITIES.
                    </p>

                </div>


                <div className="features-footer-stats">

                    <div>
                        <strong>1000+</strong>
                        <span>Data Sources</span>
                    </div>

                    <div>
                        <strong>5000+</strong>
                        <span>Cases Analyzed</span>
                    </div>

                    <div>
                        <strong>99%</strong>
                        <span>Pattern Accuracy</span>
                    </div>

                    <div>
                        <strong>24/7</strong>
                        <span>Investigation Support</span>
                    </div>

                </div>


                <div className="footer-tagline">
                    JUSTICE THROUGH INTELLIGENCE
                </div>

            </footer>

        </div>
    );
}

export default FeaturesPage;