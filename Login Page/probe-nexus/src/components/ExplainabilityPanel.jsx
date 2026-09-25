/**
 * ============================================================
 * PROBNEXUS — EXPLAINABILITY PANEL
 * ============================================================
 * Structured intelligence report panel displayed when an entity
 * is selected from the graph, key players list, or any analytics tab.
 *
 * Every field rendered here is traceable to actual analytics output.
 * No hardcoded text. Insufficient-evidence fallback is shown when data
 * is too sparse for a meaningful conclusion.
 *
 * CRITICAL: This component does NOT make legal determinations.
 * It uses "investigation lead", "requires further investigation",
 * "suspicious pattern detected" — never "criminal" or "guilty".
 * ============================================================
 */

import React, { useState } from 'react';

/* ── Risk level colours ─────────────────────────────────────── */
const RISK_COLORS = {
  CRITICAL: { bg: 'rgba(239,68,68,0.12)', border: '#ef4444', text: '#f87171', badge: '#ef4444' },
  HIGH: { bg: 'rgba(249,115,22,0.12)', border: '#f97316', text: '#fb923c', badge: '#f97316' },
  MEDIUM: { bg: 'rgba(234,179,8,0.12)', border: '#eab308', text: '#facc15', badge: '#ca8a04' },
  LOW: { bg: 'rgba(34,197,94,0.1)', border: '#22c55e', text: '#4ade80', badge: '#16a34a' },
};

/* ── Factor icon map ────────────────────────────────────────── */
const FACTOR_ICONS = {
  HIGH_CONNECTIVITY: '🔗',
  ACTIVE_PARTICIPANT: '🔗',
  HIGH_INFLUENCE: '⭐',
  MODERATE_INFLUENCE: '📊',
  HIGH_BETWEENNESS: '🌉',
  COMMUNITY_BRIDGE: '🌉',
  FINANCIAL_VOLUME: '💰',
  HIGH_VALUE_TX: '💸',
  REPEATED_CALLS: '📞',
  TX_CHAIN: '⛓',
  FINANCIAL_CHAIN: '⛓',
  HIGH_CONNECTIVITY_HUB: '🕸',
  HIGH_INFLUENCE_SUSPICIOUS_ACTOR: '⚠️',
};

/* ── Entity type colours ────────────────────────────────────── */
const ENTITY_COLORS = {
  PHONE: '#06b6d4',
  ACCOUNT: '#f59e0b',
  LOCATION: '#ec4899',
  PERSON: '#ef4444',
  UNKNOWN: '#94a3b8',
};

/* ── Circular priority score ring ─────────────────────────────── */
function ScoreRing({ score, level }) {
  const colors = RISK_COLORS[level] || RISK_COLORS.LOW;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (score / 100);
  return (
    <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
      <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="40" cy="40" r={radius}
          fill="none"
          stroke={colors.badge}
          strokeWidth="6"
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 900, color: colors.text, lineHeight: 1 }}>
          {Math.round(score)}
        </span>
        <span style={{ fontSize: '0.55rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          /100
        </span>
      </div>
    </div>
  );
}

/* ── Risk breakdown bar ────────────────────────────────────────── */
function BreakdownBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: '0.45rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '0.2rem' }}>
        <span style={{ color: '#94a3b8' }}>{label}</span>
        <span style={{ color: '#cbd5e1', fontWeight: 700 }}>{value}%</span>
      </div>
      <div style={{
        height: '5px', background: 'rgba(255,255,255,0.07)', borderRadius: '3px', overflow: 'hidden'
      }}>
        <div style={{
          width: `${Math.min(100, value)}%`,
          height: '100%',
          background: color,
          borderRadius: '3px',
          transition: 'width 0.6s ease'
        }} />
      </div>
    </div>
  );
}

/* ── Evidence pill ─────────────────────────────────────────────── */
function EvidencePill({ ev, onClickEvidence, type }) {
  const colors = {
    FIR: { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', text: '#f87171' },
    CDR: { bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.3)', text: '#22d3ee' },
    TRANSACTION: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', text: '#fbbf24' },
    RECORD: { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.2)', text: '#94a3b8' },
  };
  const c = colors[type] || colors.RECORD;
  const displayLabel = typeof ev === 'string' ? ev : ev?.displayId || String(ev);
  const evType = typeof ev === 'object' ? ev.type : type;

  return (
    <button
      type="button"
      title={typeof ev === 'object' ? ev.detail : displayLabel}
      onClick={() => onClickEvidence && onClickEvidence(ev)}
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: '5px',
        padding: '0.2rem 0.55rem',
        fontSize: '0.7rem',
        fontFamily: 'monospace',
        color: c.text,
        cursor: onClickEvidence ? 'pointer' : 'default',
        fontWeight: 700,
        letterSpacing: '0.03em',
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={e => { if (onClickEvidence) e.currentTarget.style.opacity = '0.75'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >
      {displayLabel}
    </button>
  );
}

/* ── Main Explainability Panel ─────────────────────────────────── */
export default function ExplainabilityPanel({ entityIntel, onClose, onClickEvidence }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const [showPatterns, setShowPatterns] = useState(false);

  if (!entityIntel) return null;

  const {
    entityValue,
    entityType,
    riskLevel = 'LOW',
    riskScore = 0,
    riskBreakdown = {},
    communityId,
    communityName,
    isBridge,
    bridgeExplanation,
    explanationText,
    insufficientEvidence,
    factors = [],
    evidenceDisplay = [],
    sourceRecordIds = [],
    suspiciousPatterns = [],
    predictedLinks = [],
    financialChain,
    degree,
    degreeCentrality,
    betweennessCentrality,
    influenceScore,
    roleClassification,
    connectedRelationships = [],
  } = entityIntel;

  const colors = RISK_COLORS[riskLevel] || RISK_COLORS.LOW;
  const entityColor = ENTITY_COLORS[entityType] || ENTITY_COLORS.UNKNOWN;

  /* ── Resolve evidence display items ─────────────────────────── */
  // evidenceDisplay comes from analytics engine with {id, displayId, type, detail}
  // fallback: use sourceRecordIds as raw strings
  const evidenceItems = evidenceDisplay.length > 0
    ? evidenceDisplay
    : sourceRecordIds.map(id => ({ id, displayId: `REC-${id.slice(0, 6).toUpperCase()}`, type: 'RECORD', detail: '' }));

  return (
    <div className="explain-panel">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="explain-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.12em', color: '#64748b', textTransform: 'uppercase' }}>
            Intelligence Report
          </span>
        </div>
        <button className="drawer-close-btn" onClick={onClose} type="button">✕</button>
      </div>

      <div className="explain-panel-body">

        {/* ── Entity Identity Card ─────────────────────────── */}
        <div className="explain-identity-card" style={{ borderColor: colors.border }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Entity type avatar */}
            <div style={{
              width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
              background: `${entityColor}22`,
              border: `2px solid ${entityColor}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem'
            }}>
              {entityType === 'PHONE' ? '📱' : entityType === 'ACCOUNT' ? '🏦' :
               entityType === 'LOCATION' ? '📍' : entityType === 'PERSON' ? '👤' : '🔵'}
            </div>

            {/* Entity value + type */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'monospace', fontWeight: 900, fontSize: '1.05rem',
                color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {entityValue}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                <span className="pnx-type-tag" style={{ fontSize: '0.68rem', borderColor: entityColor, color: entityColor }}>
                  {entityType}
                </span>
                <span className={`pnx-risk-badge risk-${riskLevel.toLowerCase()}`} style={{ fontSize: '0.68rem' }}>
                  {riskLevel} PRIORITY
                </span>
                {isBridge && (
                  <span style={{
                    background: 'rgba(192,132,252,0.15)', border: '1px solid rgba(192,132,252,0.35)',
                    color: '#c084fc', fontSize: '0.65rem', padding: '0.1rem 0.4rem',
                    borderRadius: '4px', fontWeight: 700
                  }}>
                    🌉 BRIDGE
                  </span>
                )}
                {riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? (
                  <span style={{
                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                    color: '#f87171', fontSize: '0.65rem', padding: '0.1rem 0.4rem',
                    borderRadius: '4px', fontWeight: 700
                  }}>
                    KEY INVESTIGATION LEAD
                  </span>
                ) : null}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.2rem' }}>
                {roleClassification || 'Active Network Entity'}
                {communityName ? ` · ${communityName}` : ''}
              </div>
            </div>

            {/* Score ring */}
            <ScoreRing score={riskScore} level={riskLevel} />
          </div>
        </div>

        {/* ── Metric Pills Row ──────────────────────────────── */}
        <div className="explain-metric-row">
          <div className="explain-metric-pill">
            <span className="metric-pill-label">Degree</span>
            <span className="metric-pill-val">{degree ?? '—'}</span>
          </div>
          <div className="explain-metric-pill">
            <span className="metric-pill-label">Degree C.</span>
            <span className="metric-pill-val">
              {degreeCentrality != null ? degreeCentrality.toFixed(3) : '—'}
            </span>
          </div>
          <div className="explain-metric-pill">
            <span className="metric-pill-label">Betweenness</span>
            <span className="metric-pill-val">
              {betweennessCentrality != null ? betweennessCentrality.toFixed(3) : '—'}
            </span>
          </div>
          <div className="explain-metric-pill">
            <span className="metric-pill-label">Influence</span>
            <span className="metric-pill-val" style={{ color: '#fbbf24' }}>
              {influenceScore != null ? `${(influenceScore * 100).toFixed(1)}%` : '—'}
            </span>
          </div>
        </div>

        {/* ── Risk Score Breakdown (collapsible) ─────────────── */}
        {Object.keys(riskBreakdown).length > 0 && (
          <div className="explain-section-card">
            <button
              className="explain-section-toggle"
              onClick={() => setShowBreakdown(v => !v)}
              type="button"
            >
              <span>📊 Risk Score Breakdown</span>
              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                {Math.round(riskScore)}/100 {showBreakdown ? '▲' : '▼'}
              </span>
            </button>
            {showBreakdown && (
              <div style={{ marginTop: '0.75rem' }}>
                <BreakdownBar label="Network Influence" value={riskBreakdown.influence ?? 0} color="#fbbf24" />
                <BreakdownBar label="Bridge / Intermediary" value={riskBreakdown.bridge ?? 0} color="#c084fc" />
                <BreakdownBar label="Communication Activity" value={riskBreakdown.communication ?? 0} color="#06b6d4" />
                <BreakdownBar label="Financial Activity" value={riskBreakdown.financial ?? 0} color="#f59e0b" />
                <BreakdownBar label="Suspicious Patterns" value={riskBreakdown.patterns ?? 0} color="#ef4444" />
                <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '0.5rem' }}>
                  Formula: 0.30×influence + 0.20×bridge + 0.20×communication + 0.20×financial + 0.10×patterns
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Community / Bridge Detection ─────────────────── */}
        {isBridge && bridgeExplanation && (
          <div className="explain-section-card explain-bridge-card">
            <div className="explain-section-label">🌉 COMMUNITY BRIDGE DETECTED</div>
            <p style={{ fontSize: '0.8rem', color: '#d4b8f9', lineHeight: 1.55, margin: '0.4rem 0 0' }}>
              {bridgeExplanation}
            </p>
          </div>
        )}

        {/* ── Financial Chain ───────────────────────────────── */}
        {financialChain && (
          <div className="explain-section-card explain-chain-card">
            <div className="explain-section-label">⛓ FINANCIAL CHAIN DETECTED</div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#fbbf24', margin: '0.4rem 0 0.2rem', lineHeight: 1.6 }}>
              {financialChain.chainText}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {financialChain.hopCount} hop(s) · Total observed: ₹{(financialChain.totalAmount || 0).toLocaleString('en-IN')}
            </div>
          </div>
        )}

        {/* ── Insufficient Evidence ─────────────────────────── */}
        {insufficientEvidence ? (
          <div className="explain-section-card explain-insufficient-card">
            <div className="explain-section-label" style={{ color: '#64748b' }}>⚠️ LIMITED DATA</div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.55, margin: '0.4rem 0 0' }}>
              {explanationText}
            </p>
          </div>
        ) : (
          <>
            {/* ── Why Flagged? Factor Cards ─────────────────── */}
            {factors.length > 0 && (
              <div className="explain-section-card">
                <div className="explain-section-label">🔍 WHY WAS THIS ENTITY FLAGGED?</div>
                <div className="explain-factors-grid">
                  {factors.map((f, i) => (
                    <div key={i} className="explain-factor-card">
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '0.1rem' }}>
                          {FACTOR_ICONS[f.type] || '●'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.15rem' }}>
                            {f.label}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700, marginBottom: '0.2rem' }}>
                            {f.value}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.45 }}>
                            {f.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── AI Explanation ────────────────────────────── */}
            {explanationText && (
              <div className="explain-section-card explain-ai-card">
                <div className="explain-section-label">🤖 AI EXPLANATION</div>
                <p style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.6, margin: '0.4rem 0 0', fontStyle: 'italic' }}>
                  "{explanationText}"
                </p>
                <div style={{ fontSize: '0.65rem', color: '#475569', marginTop: '0.5rem' }}>
                  ⚠ AI assistance only. This is not a legal determination. Entity requires investigator review.
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Supporting Evidence ───────────────────────────── */}
        {evidenceItems.length > 0 && (
          <div className="explain-section-card">
            <div className="explain-section-label">📋 SUPPORTING EVIDENCE</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
              {evidenceItems.map((ev, i) => (
                <EvidencePill
                  key={i}
                  ev={ev}
                  type={typeof ev === 'object' ? ev.type : 'RECORD'}
                  onClickEvidence={onClickEvidence}
                />
              ))}
            </div>
            <div style={{ fontSize: '0.67rem', color: '#475569', marginTop: '0.4rem' }}>
              Click an evidence item to inspect the record.
            </div>
          </div>
        )}

        {/* ── Connected Relationships ──────────────────────── */}
        {connectedRelationships.length > 0 && (
          <div className="explain-section-card">
            <div className="explain-section-label">
              🔗 CONNECTED ENTITIES ({connectedRelationships.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
              {connectedRelationships.slice(0, 8).map((rel, i) => (
                <div key={i} className="explain-rel-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      background: ENTITY_COLORS[rel.targetEntityType] || '#94a3b8'
                    }} />
                    <span style={{ fontFamily: 'monospace', color: '#f1f5f9', fontSize: '0.78rem' }}>
                      {rel.targetEntityValue}
                    </span>
                  </div>
                  <span style={{
                    color: rel.relationshipType === 'CALLED' ? '#22d3ee' : '#fbbf24',
                    fontSize: '0.68rem', fontWeight: 700
                  }}>
                    {rel.relationshipType}
                  </span>
                </div>
              ))}
              {connectedRelationships.length > 8 && (
                <div style={{ fontSize: '0.7rem', color: '#475569' }}>
                  +{connectedRelationships.length - 8} more connections
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Suspicious Patterns for this entity ─────────── */}
        {suspiciousPatterns.length > 0 && (
          <div className="explain-section-card">
            <button
              className="explain-section-toggle"
              onClick={() => setShowPatterns(v => !v)}
              type="button"
            >
              <span>🚨 SUSPICIOUS PATTERNS ({suspiciousPatterns.length})</span>
              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{showPatterns ? '▲' : '▼'}</span>
            </button>
            {showPatterns && (
              <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {suspiciousPatterns.map((p, i) => (
                  <div key={i} className="explain-pattern-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f1f5f9' }}>
                        {(p.patternType || '').replace(/_/g, ' ')}
                      </span>
                      <span className={`pnx-risk-badge risk-${(p.severity || 'HIGH').toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                        {p.severity}
                      </span>
                    </div>
                    {p.whyDetected && (
                      <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0.3rem 0 0', lineHeight: 1.4 }}>
                        {p.whyDetected}
                      </p>
                    )}
                    {p.evidenceReferences && p.evidenceReferences.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                        {p.evidenceReferences.map((ref, ri) => (
                          <EvidencePill key={ri} ev={ref} type="RECORD" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Predicted Links for this entity ──────────────── */}
        {predictedLinks.length > 0 && (
          <div className="explain-section-card">
            <button
              className="explain-section-toggle"
              onClick={() => setShowPredictions(v => !v)}
              type="button"
            >
              <span>🔮 PREDICTED CONNECTIONS ({predictedLinks.length})</span>
              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{showPredictions ? '▲' : '▼'}</span>
            </button>
            {showPredictions && (
              <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {predictedLinks.map((pred, i) => {
                  const otherVal = pred.entityAValue === entityValue
                    ? pred.entityBValue : pred.entityAValue;
                  return (
                    <div key={i} className="explain-prediction-row">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          background: 'rgba(168,85,247,0.12)',
                          border: '1px solid rgba(168,85,247,0.3)',
                          color: '#c084fc', fontSize: '0.65rem', padding: '0.15rem 0.4rem',
                          borderRadius: '4px', fontWeight: 700
                        }}>
                          AI-PREDICTED — NOT CONFIRMED
                        </span>
                        <span style={{ color: '#a855f7', fontSize: '0.72rem', fontWeight: 700 }}>
                          {pred.confidence}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        fontFamily: 'monospace', fontSize: '0.8rem', marginTop: '0.3rem'
                      }}>
                        <span style={{ color: '#22d3ee', fontWeight: 700 }}>{entityValue}</span>
                        <span style={{ color: '#64748b', letterSpacing: '3px' }}>┄┄┄</span>
                        <span style={{ color: '#fbbf24', fontWeight: 700 }}>{otherVal}</span>
                      </div>
                      {pred.explanation && (
                        <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '0.25rem 0 0', lineHeight: 1.4 }}>
                          {pred.explanation}
                        </p>
                      )}
                      <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '0.2rem' }}>
                        Jaccard: <strong style={{ color: '#f1f5f9' }}>{(pred.jaccardScore || 0).toFixed(3)}</strong>
                        {' · '}Adamic-Adar: <strong style={{ color: '#f1f5f9' }}>{(pred.adamicAdarScore || 0).toFixed(3)}</strong>
                        {' · '}Shared neighbors: <strong style={{ color: '#f1f5f9' }}>{pred.commonNeighborsCount ?? pred.sharedNeighborsCount ?? 0}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
