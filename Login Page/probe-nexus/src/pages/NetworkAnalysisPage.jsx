/**
 * ============================================================
 * PROBNEXUS — PREMIUM CRIMINAL NETWORK ANALYSIS DASHBOARD
 * ============================================================
 * High-density cyber intelligence investigation platform:
 *   - Live multi-modal network graph with React Flow
 *   - Directional call and financial transaction edges
 *   - Force-directed / clustered community layout
 *   - Top 4 live KPI statistic cards
 *   - Key Players, Louvain Communities, Anomaly Patterns,
 *     and Hidden Link Predictions
 *   - Deep Node Intelligence Drawer with Evidence Traceability
 * ============================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import UserMenu from '../components/UserMenu';
import EntityNode from '../components/graph/EntityNode';
import {
  fetchCases,
  fetchCaseNetwork,
  buildCaseRelationships,
  fetchEvidenceRecord,
  runCaseAnalytics,
  fetchCaseAnalytics,
  fetchEntityIntelligence,
  runLinkPredictions
} from '../config/api';
import '../styles/network-analysis.css';
import '../styles/signup.css';

const nodeTypes = {
  entityNode: EntityNode,
};

export default function NetworkAnalysisPage({
  onNavigate,
  currentUser,
  selectedCaseId: propCaseId,
  onSelectCase
}) {
  const navigate = (page) => { if (onNavigate) onNavigate(page); };

  // Current case state
  const [selectedCaseId, setSelectedCaseId] = useState(propCaseId || 'PNX-2026-001');
  const [availableCases, setAvailableCases] = useState([{ caseNumber: 'PNX-2026-001', title: 'Operation Nexus Wire Fraud' }]);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiStatusStep, setAiStatusStep] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [error, setError] = useState(null);

  // Active view tab: 'GRAPH' | 'KEY_PLAYERS' | 'SUSPICIOUS' | 'COMMUNITIES' | 'PREDICTIONS'
  const [activeView, setActiveView] = useState('GRAPH');

  // Raw network data from backend
  const [rawNetwork, setRawNetwork] = useState({ nodes: [], edges: [], caseId: '', caseNumber: '' });

  // AI/ML Analytics state
  const [analyticsData, setAnalyticsData] = useState(null);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);
  const [typeFilters, setTypeFilters] = useState({
    PHONE: true,
    ACCOUNT: true,
    LOCATION: true,
    PERSON: true
  });
  const [relFilters, setRelFilters] = useState({
    CALLED: true,
    TRANSFERRED_TO: true
  });

  // Selected item for side inspection drawer
  const [selectedItem, setSelectedItem] = useState(null);
  const [entityIntel, setEntityIntel] = useState(null);
  const [evidenceDetail, setEvidenceDetail] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Top Nav Links
  const navLinks = [
    { label: 'Home', page: 'about' },
    { label: 'About', page: 'about' },
    { label: 'Features', page: 'features' },
    { label: 'How It Works', page: 'how-it-works' },
    { label: 'Dashboard', page: 'dashboard' },
    { label: 'Network Analysis', page: 'network-analysis', active: true },
    { label: 'Case Builder', page: 'case-builder' },
    { label: 'Contents', page: 'contents' }
  ];

  // Sync propCaseId changes
  useEffect(() => {
    if (propCaseId && propCaseId !== selectedCaseId) {
      setSelectedCaseId(propCaseId);
    }
  }, [propCaseId]);

  // Fetch available cases from PostgreSQL
  useEffect(() => {
    async function loadCases() {
      try {
        const cases = await fetchCases();
        if (cases && cases.length > 0) {
          const list = [{ caseNumber: 'PNX-2026-001', title: 'Operation Nexus Wire Fraud (Demo)' }];
          cases.forEach(c => {
            if (c.caseNumber !== 'PNX-2026-001' && !list.some(item => item.caseNumber === c.caseNumber)) {
              list.push(c);
            }
          });
          setAvailableCases(list);
        }
      } catch (err) {
        console.warn('Could not load case list:', err);
      }
    }
    loadCases();
  }, []);

  const handleCaseChange = (newCaseId) => {
    setSelectedCaseId(newCaseId);
    if (onSelectCase) onSelectCase(newCaseId);
  };

  /* ── Force-Directed & Community Clustered Layout Algorithm ── */
  const calculateNodeLayout = (rawNodes, rawEdges, commData) => {
    const positions = {};
    if (!rawNodes || rawNodes.length === 0) return positions;

    // Group nodes by Louvain Community or Entity Type
    const communityGroups = {};
    rawNodes.forEach(node => {
      const commId = commData?.entityIntelligenceMap?.[node.id]?.communityId || 1;
      if (!communityGroups[commId]) communityGroups[commId] = [];
      communityGroups[commId].push(node);
    });

    const commIds = Object.keys(communityGroups);
    const numCommunities = commIds.length || 1;

    // Community cluster centers arranged in circular orbit
    const clusterOrbitRadius = Math.max(300, numCommunities * 180);

    commIds.forEach((cId, cIdx) => {
      const angle = (2 * Math.PI * cIdx) / numCommunities;
      const centerX = 500 + clusterOrbitRadius * Math.cos(angle);
      const centerY = 350 + clusterOrbitRadius * Math.sin(angle);

      const groupNodes = communityGroups[cId];
      const count = groupNodes.length;
      const nodeOrbitRadius = Math.max(90, count * 35);

      groupNodes.forEach((node, nIdx) => {
        // Position nodes radially around community cluster center
        const nodeAngle = (2 * Math.PI * nIdx) / Math.max(1, count);
        const isCenter = count > 1 && nIdx === 0 && commData?.entityIntelligenceMap?.[node.id]?.rank <= 3;

        positions[node.id] = {
          x: isCenter ? centerX : centerX + nodeOrbitRadius * Math.cos(nodeAngle),
          y: isCenter ? centerY : centerY + nodeOrbitRadius * Math.sin(nodeAngle)
        };
      });
    });

    return positions;
  };

  /* ── Data Fetching for Selected Case ── */
  const loadNetworkData = useCallback(async (caseIdToLoad) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch case network graph
      const netData = await fetchCaseNetwork(caseIdToLoad);
      setRawNetwork(netData || { nodes: [], edges: [] });

      // 2. Fetch AI Analytics intelligence
      try {
        const aData = await fetchCaseAnalytics(caseIdToLoad);
        if (aData && aData.keyPlayers) {
          setAnalyticsData(aData);
        } else {
          setAnalyticsData(null);
        }
      } catch (aErr) {
        setAnalyticsData(null);
      }
    } catch (err) {
      console.error('Failed to load network:', err);
      setError(err.message || 'Unable to load investigation network.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNetworkData(selectedCaseId);
  }, [loadNetworkData, selectedCaseId]);

  /* ── Pipeline Triggers ── */
  const handleBuildNetwork = async () => {
    setBuilding(true);
    setFeedbackMessage('Rebuilding directional investigation network...');
    try {
      const res = await buildCaseRelationships(selectedCaseId);
      setFeedbackMessage(`✓ Network updated successfully (${res.totalRelationships} relationships).`);
      await loadNetworkData(selectedCaseId);
      setTimeout(() => setFeedbackMessage(''), 4000);
    } catch (err) {
      console.error('Build network failed:', err);
      setFeedbackMessage('Failed to rebuild network. Check backend connection.');
      setTimeout(() => setFeedbackMessage(''), 4000);
    } finally {
      setBuilding(false);
    }
  };

  const handleRunAIAnalysis = async () => {
    setAiRunning(true);
    setAiStatusStep('Executing Python NetworkX Analytics Engine...');
    try {
      const res = await runCaseAnalytics(selectedCaseId);
      await runLinkPredictions(selectedCaseId);
      setAnalyticsData(res);
      setFeedbackMessage(
        `✓ AI Analytics complete: ${res.keyPlayers?.length || 0} Key Players, ${res.communities?.length || 0} Communities, ${res.predictedLinks?.length || 0} Predicted Links.`
      );
      await loadNetworkData(selectedCaseId);
      setTimeout(() => setFeedbackMessage(''), 5000);
    } catch (err) {
      console.error('AI Analytics Error:', err);
      setFeedbackMessage('AI Analytics execution failed: ' + (err.message || 'Unknown error'));
      setTimeout(() => setFeedbackMessage(''), 5000);
    } finally {
      setAiRunning(false);
      setAiStatusStep('');
    }
  };

  /* ── Transform Raw Network Data into React Flow Nodes & Edges ── */
  useEffect(() => {
    if (!rawNetwork.nodes) return;

    const positions = calculateNodeLayout(rawNetwork.nodes, rawNetwork.edges, analyticsData);
    const intelMap = analyticsData?.entityIntelligenceMap || {};

    // Filter nodes by selected entity types
    const filteredRawNodes = rawNetwork.nodes.filter(n => typeFilters[n.entityType] !== false);
    const visibleNodeIds = new Set(filteredRawNodes.map(n => n.id));

    // Calculate degree connection counts per node
    const degreeMap = {};
    (rawNetwork.edges || []).forEach(e => {
      degreeMap[e.source] = (degreeMap[e.source] || 0) + 1;
      degreeMap[e.target] = (degreeMap[e.target] || 0) + 1;
    });

    // Create React Flow Nodes
    const flowNodes = filteredRawNodes.map(n => {
      const intel = intelMap[n.id] || {};
      return {
        id: n.id,
        type: 'entityNode',
        position: positions[n.id] || { x: 400, y: 300 },
        data: {
          entityType: n.entityType,
          entityValue: n.entityValue,
          normalizedValue: n.normalizedValue,
          isHighlighted: highlightedNodeId === n.id,
          riskLevel: intel.riskLevel,
          riskScore: intel.riskScore,
          influenceScore: intel.influenceScore,
          rank: intel.rank,
          communityId: intel.communityId,
          isBridge: intel.isBridge,
          roleClassification: intel.roleClassification,
          connectionCount: degreeMap[n.id] || 0
        }
      };
    });

    // Create React Flow Directional Edges
    const filteredRawEdges = (rawNetwork.edges || []).filter(e => {
      if (relFilters[e.relationshipType] === false) return false;
      return visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target);
    });

    const flowEdges = filteredRawEdges.map(e => {
      const isCalled = e.relationshipType === 'CALLED';
      const isTx = e.relationshipType === 'TRANSFERRED_TO';

      let edgeLabel = undefined;
      if (isTx && Number(e.weight) > 1) {
        edgeLabel = `₹${Number(e.weight).toLocaleString('en-IN')}`;
      } else if (isCalled) {
        edgeLabel = 'CALLED';
      }

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: 'r-out',
        targetHandle: 'l-in',
        type: 'smoothstep',
        animated: isCalled,
        style: {
          stroke: isCalled ? '#06b6d4' : isTx ? '#f59e0b' : '#a855f7',
          strokeWidth: isTx && Number(e.weight) > 50000 ? 3 : 2,
          strokeDasharray: isCalled ? '5 5' : undefined
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isCalled ? '#06b6d4' : isTx ? '#f59e0b' : '#a855f7',
          width: 16,
          height: 16
        },
        label: edgeLabel,
        labelStyle: {
          fill: isCalled ? '#22d3ee' : '#fbbf24',
          fontWeight: 700,
          fontSize: 11
        },
        labelBgStyle: {
          fill: '#090a10',
          fillOpacity: 0.9,
          stroke: isCalled ? '#06b6d4' : '#f59e0b',
          strokeWidth: 1,
          rx: 4,
          ry: 4
        },
        data: e
      };
    });

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [rawNetwork, analyticsData, typeFilters, relFilters, highlightedNodeId, setNodes, setEdges]);

  /* ── Node & Edge Click Selection ── */
  const onNodeClick = async (_, node) => {
    setSelectedItem({ type: 'node', id: node.id, data: node.data });
    setInspectLoading(true);
    setEntityIntel(null);
    setEvidenceDetail(null);
    try {
      const intel = await fetchEntityIntelligence(selectedCaseId, node.id);
      setEntityIntel(intel);
    } catch (err) {
      console.warn('Failed to fetch full entity intelligence:', err);
    } finally {
      setInspectLoading(false);
    }
  };

  const onEdgeClick = async (_, edge) => {
    setSelectedItem({ type: 'edge', id: edge.id, data: edge.data });
    setInspectLoading(true);
    setEvidenceDetail(null);
    try {
      if (edge.data?.sourceRecordId) {
        const ev = await fetchEvidenceRecord(selectedCaseId, edge.data.relationshipType === 'CALLED' ? 'CALL' : 'TRANSACTION', edge.data.sourceRecordId);
        setEvidenceDetail(ev);
      }
    } catch (err) {
      console.warn('Failed to fetch evidence record for edge:', err);
    } finally {
      setInspectLoading(false);
    }
  };

  /* ── Search Handler ── */
  const handleSearch = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (!q.trim()) {
      setHighlightedNodeId(null);
      return;
    }
    const match = rawNetwork.nodes.find(n =>
      (n.entityValue || '').toLowerCase().includes(q.toLowerCase()) ||
      (n.normalizedValue || '').toLowerCase().includes(q.toLowerCase())
    );
    if (match) {
      setHighlightedNodeId(match.id);
    } else {
      setHighlightedNodeId(null);
    }
  };

  /* ── Live KPI Computations ── */
  const totalEntitiesCount = rawNetwork.nodes?.length || 0;
  const totalConnectionsCount = rawNetwork.edges?.length || 0;
  const highPriorityCount =
    (analyticsData?.riskSummary?.CRITICAL || 0) + (analyticsData?.riskSummary?.HIGH || 0);
  const hiddenPredictionsCount = analyticsData?.predictedLinks?.length || 0;

  return (
    <div className="network-page">
      {/* ============================================================
          TOP NAVBAR
         ============================================================ */}
      <header className="network-top-navbar">
        <div className="network-brand-area" onClick={() => navigate('about')}>
          <img src="/logo.png" alt="ProbNexus" className="network-brand-logo" />
          <span className="network-brand-name">ProbNexus</span>
        </div>

        <nav className="network-top-nav-links">
          {navLinks.map(l => (
            <button
              key={l.page}
              className={`network-nav-item ${l.active ? 'is-active' : ''}`}
              onClick={() => navigate(l.page)}
              type="button"
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="network-top-actions">
          <button
            className="theme-button"
            onClick={() => document.body.classList.toggle('dark-mode')}
            aria-label="Theme"
            type="button"
          >
            ☼
          </button>
          <div className="nav-divider" />
          <UserMenu user={currentUser} onNavigate={navigate} />
        </div>
      </header>

      {/* ============================================================
          MAIN WORKSPACE LAYOUT (SIDEBAR + MAIN CANVAS)
         ============================================================ */}
      <div className="network-workspace-layout">
        {/* Left Compact Investigation Sidebar */}
        <aside className="investigation-sidebar">
          <button
            className="sidebar-action-btn"
            onClick={() => navigate('dashboard')}
            title="Dashboard"
            type="button"
          >
            <span>⌘</span>
            <span className="sidebar-tooltip">Investigation Dashboard</span>
          </button>

          <button
            className={`sidebar-action-btn ${activeView === 'GRAPH' ? 'is-active' : ''}`}
            onClick={() => setActiveView('GRAPH')}
            title="Network Analysis"
            type="button"
          >
            <span>🕸</span>
            <span className="sidebar-tooltip">Network Graph</span>
          </button>

          <button
            className={`sidebar-action-btn ${activeView === 'KEY_PLAYERS' ? 'is-active' : ''}`}
            onClick={() => setActiveView('KEY_PLAYERS')}
            title="Key Players"
            type="button"
          >
            <span>⭐</span>
            <span className="sidebar-tooltip">Key Network Entities</span>
          </button>

          <button
            className={`sidebar-action-btn ${activeView === 'PREDICTIONS' ? 'is-active' : ''}`}
            onClick={() => setActiveView('PREDICTIONS')}
            title="Predictions"
            type="button"
          >
            <span>🔮</span>
            <span className="sidebar-tooltip">Hidden Link Predictions</span>
          </button>

          <button
            className={`sidebar-action-btn ${activeView === 'SUSPICIOUS' ? 'is-active' : ''}`}
            onClick={() => setActiveView('SUSPICIOUS')}
            title="Suspicious Patterns"
            type="button"
          >
            <span>🚨</span>
            <span className="sidebar-tooltip">Suspicious Patterns</span>
          </button>

          <button
            className="sidebar-action-btn"
            onClick={() => navigate('case-builder')}
            title="Case Builder"
            type="button"
          >
            <span>➕</span>
            <span className="sidebar-tooltip">New Investigation Case</span>
          </button>
        </aside>

        {/* Main Viewport */}
        <main className="network-main-viewport">
          {/* Header & KPI Bar */}
          <div className="network-control-header">
            <div className="network-header-upper">
              <div className="network-heading-block">
                <h1 className="network-heading-title">
                  <span>⚡</span> CRIMINAL NETWORK ANALYSIS
                </h1>
                <p className="network-heading-subtitle">
                  Visualize relationships. Detect patterns. Uncover hidden connections.
                </p>
              </div>

              {/* Case Switcher & Action Buttons */}
              <div className="network-header-controls">
                <select
                  className="network-case-select"
                  value={selectedCaseId}
                  onChange={e => handleCaseChange(e.target.value)}
                >
                  {availableCases.map(c => (
                    <option key={c.caseNumber || c.id} value={c.caseNumber || c.id}>
                      CASE: {c.caseNumber} {c.title ? `— ${c.title}` : ''}
                    </option>
                  ))}
                </select>

                <button className="btn-new-case" onClick={() => navigate('case-builder')} type="button">
                  <span>+</span> New Case
                </button>

                <button
                  className="btn-run-ai-pipeline"
                  onClick={handleRunAIAnalysis}
                  disabled={aiRunning || loading}
                  type="button"
                >
                  {aiRunning ? (
                    <>
                      <span className="spinner-icon" /> {aiStatusStep || 'Running AI...'}
                    </>
                  ) : (
                    <>
                      <span>🧠</span> Run AI Analysis
                    </>
                  )}
                </button>

                <button
                  className="btn-refresh-net"
                  onClick={handleBuildNetwork}
                  disabled={building || loading || aiRunning}
                  type="button"
                >
                  <span>⚡</span> Refresh
                </button>
              </div>
            </div>

            {/* Top 4 KPI Cards (Live Backend Statistics) */}
            <div className="network-kpi-grid">
              <div className="kpi-card">
                <div className="kpi-info">
                  <span className="kpi-title">Total Entities</span>
                  <span className="kpi-value">{totalEntitiesCount}</span>
                </div>
                <div className="kpi-icon-avatar entities">👥</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-info">
                  <span className="kpi-title">Total Connections</span>
                  <span className="kpi-value">{totalConnectionsCount}</span>
                </div>
                <div className="kpi-icon-avatar connections">🔗</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-info">
                  <span className="kpi-title">High-Priority Leads</span>
                  <span className="kpi-value" style={{ color: '#f87171' }}>
                    {highPriorityCount}
                  </span>
                </div>
                <div className="kpi-icon-avatar risk">⚠️</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-info">
                  <span className="kpi-title">Hidden Predictions</span>
                  <span className="kpi-value" style={{ color: '#c084fc' }}>
                    {hiddenPredictionsCount}
                  </span>
                </div>
                <div className="kpi-icon-avatar predictions">🔮</div>
              </div>
            </div>
          </div>

          {feedbackMessage && (
            <div className="cb-banner success" style={{ margin: '0.75rem 1.75rem 0' }}>
              <span>{feedbackMessage}</span>
            </div>
          )}

          {/* Filter Toolbar */}
          <div className="network-filter-toolbar">
            <div className="view-mode-tabs">
              <button
                className={`view-tab-btn ${activeView === 'GRAPH' ? 'is-active' : ''}`}
                onClick={() => setActiveView('GRAPH')}
                type="button"
              >
                <span>🕸</span> Network Graph
              </button>
              <button
                className={`view-tab-btn ${activeView === 'KEY_PLAYERS' ? 'is-active' : ''}`}
                onClick={() => setActiveView('KEY_PLAYERS')}
                type="button"
              >
                <span>⭐</span> Key Players{' '}
                <span className="view-tab-badge">{analyticsData?.keyPlayers?.length || 0}</span>
              </button>
              <button
                className={`view-tab-btn ${activeView === 'SUSPICIOUS' ? 'is-active' : ''}`}
                onClick={() => setActiveView('SUSPICIOUS')}
                type="button"
              >
                <span>🚨</span> Suspicious Activity{' '}
                <span className="view-tab-badge">{analyticsData?.suspiciousPatterns?.length || 0}</span>
              </button>
              <button
                className={`view-tab-btn ${activeView === 'COMMUNITIES' ? 'is-active' : ''}`}
                onClick={() => setActiveView('COMMUNITIES')}
                type="button"
              >
                <span>👥</span> Communities{' '}
                <span className="view-tab-badge">{analyticsData?.communities?.length || 0}</span>
              </button>
              <button
                className={`view-tab-btn ${activeView === 'PREDICTIONS' ? 'is-active' : ''}`}
                onClick={() => setActiveView('PREDICTIONS')}
                type="button"
              >
                <span>🔮</span> Predictions{' '}
                <span className="view-tab-badge">{analyticsData?.predictedLinks?.length || 0}</span>
              </button>
            </div>

            {activeView === 'GRAPH' && (
              <div className="filter-controls-group">
                <div className="search-field-box">
                  <span>🔍</span>
                  <input
                    type="text"
                    placeholder="Search phone, account..."
                    value={searchQuery}
                    onChange={handleSearch}
                  />
                  {searchQuery && (
                    <button
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                      onClick={() => { setSearchQuery(''); setHighlightedNodeId(null); }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="filter-tag-checkboxes">
                  <label className="tag-checkbox-item">
                    <input
                      type="checkbox"
                      checked={typeFilters.PHONE}
                      onChange={e => setTypeFilters(p => ({ ...p, PHONE: e.target.checked }))}
                    />
                    <span className="tag-dot phone" /> PHONE
                  </label>
                  <label className="tag-checkbox-item">
                    <input
                      type="checkbox"
                      checked={typeFilters.ACCOUNT}
                      onChange={e => setTypeFilters(p => ({ ...p, ACCOUNT: e.target.checked }))}
                    />
                    <span className="tag-dot account" /> ACCOUNT
                  </label>
                  <label className="tag-checkbox-item">
                    <input
                      type="checkbox"
                      checked={typeFilters.LOCATION}
                      onChange={e => setTypeFilters(p => ({ ...p, LOCATION: e.target.checked }))}
                    />
                    <span className="tag-dot location" /> LOCATION
                  </label>
                  <label className="tag-checkbox-item">
                    <input
                      type="checkbox"
                      checked={relFilters.CALLED}
                      onChange={e => setRelFilters(p => ({ ...p, CALLED: e.target.checked }))}
                    />
                    <span style={{ color: '#06b6d4', fontWeight: 700 }}>—</span> CALLED
                  </label>
                  <label className="tag-checkbox-item">
                    <input
                      type="checkbox"
                      checked={relFilters.TRANSFERRED_TO}
                      onChange={e => setRelFilters(p => ({ ...p, TRANSFERRED_TO: e.target.checked }))}
                    />
                    <span style={{ color: '#f59e0b', fontWeight: 700 }}>—</span> TRANSFERS
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* ============================================================
              GRAPH CANVAS VIEW
             ============================================================ */}
          {activeView === 'GRAPH' && (
            <div className="network-canvas-stage">
              {loading ? (
                <div className="network-state-screen">
                  <div className="state-spinner" />
                  <h3>Loading criminal network model...</h3>
                  <p>Fetching graph nodes and directional evidence edges from PostgreSQL.</p>
                </div>
              ) : error ? (
                <div className="network-state-screen error">
                  <div className="state-icon">⚠️</div>
                  <h3>Unable to load investigation network</h3>
                  <p>{error}</p>
                </div>
              ) : (
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onNodeClick={onNodeClick}
                  onEdgeClick={onEdgeClick}
                  nodeTypes={nodeTypes}
                  fitView
                  attributionPosition="bottom-right"
                  minZoom={0.2}
                  maxZoom={2.5}
                >
                  <Background color="#1e1e2d" gap={24} size={1.2} />
                  <Controls className="pnx-flow-controls" />
                  <MiniMap
                    nodeColor={n => {
                      if (n.data?.entityType === 'PHONE') return '#06b6d4';
                      if (n.data?.entityType === 'ACCOUNT') return '#f59e0b';
                      if (n.data?.entityType === 'LOCATION') return '#ec4899';
                      return '#ef4444';
                    }}
                    maskColor="rgba(8, 8, 14, 0.75)"
                    style={{ background: '#0f1019', border: '1px solid rgba(255,255,255,0.08)' }}
                  />

                  {/* Floating Legend */}
                  <div className="network-floating-legend">
                    <div className="legend-section-title">Entity Classification</div>
                    <div className="legend-items-row">
                      <span className="legend-pill">
                        <span className="tag-dot phone" /> Phone
                      </span>
                      <span className="legend-pill">
                        <span className="tag-dot account" /> Account
                      </span>
                      <span className="legend-pill">
                        <span className="tag-dot location" /> Location
                      </span>
                      <span className="legend-pill">
                        <span className="tag-dot person" /> Person
                      </span>
                    </div>

                    <div className="legend-section-title" style={{ marginTop: '0.2rem' }}>
                      Relationships & Indicators
                    </div>
                    <div className="legend-items-row">
                      <span className="legend-pill" style={{ color: '#22d3ee' }}>
                        — Called
                      </span>
                      <span className="legend-pill" style={{ color: '#fbbf24' }}>
                        — Transferred To
                      </span>
                      <span className="legend-pill" style={{ color: '#f59e0b' }}>
                        ★ Key Player
                      </span>
                      <span className="legend-pill" style={{ color: '#c084fc' }}>
                        🌉 Bridge
                      </span>
                    </div>
                  </div>
                </ReactFlow>
              )}
            </div>
          )}

          {/* ============================================================
              DEDICATED VIEW: KEY PLAYERS
             ============================================================ */}
          {activeView === 'KEY_PLAYERS' && (
            <div className="network-embedded-view">
              <h2 className="view-page-title">
                <span>⭐</span> Most Influential Entities (Key Players)
              </h2>
              <div className="kp-table-container">
                <table className="kp-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Entity Value</th>
                      <th>Type</th>
                      <th>Role Classification</th>
                      <th>Influence Score</th>
                      <th>Degree Centrality</th>
                      <th>Betweenness</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analyticsData?.keyPlayers || []).map((kp, idx) => (
                      <tr key={kp.entityId || idx}>
                        <td>
                          <span className="node-rank-pill">#{kp.rank || idx + 1}</span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{kp.entityValue}</td>
                        <td>
                          <span className="pnx-type-tag">{kp.entityType}</span>
                        </td>
                        <td>{kp.roleClassification || 'Active Participant'}</td>
                        <td style={{ color: '#fbbf24', fontWeight: 700 }}>
                          {(kp.influenceScore * 100).toFixed(1)}%
                        </td>
                        <td>{(kp.degreeCentrality || 0).toFixed(3)}</td>
                        <td>{(kp.betweennessCentrality || 0).toFixed(3)}</td>
                        <td>
                          <button
                            className="cb-btn-secondary"
                            style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem' }}
                            onClick={() => {
                              setActiveView('GRAPH');
                              setHighlightedNodeId(kp.entityId);
                            }}
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ============================================================
              DEDICATED VIEW: SUSPICIOUS PATTERNS
             ============================================================ */}
          {activeView === 'SUSPICIOUS' && (
            <div className="network-embedded-view">
              <h2 className="view-page-title">
                <span>🚨</span> Suspicious Activity & Behavioral Anomalies
              </h2>
              <div className="pattern-cards-grid">
                {(analyticsData?.suspiciousPatterns || []).map((p, idx) => (
                  <div key={idx} className="pattern-card">
                    <div className="pattern-card-head">
                      <span className="pattern-type-title">{p.patternType?.replace(/_/g, ' ')}</span>
                      <span
                        className={`pnx-risk-badge risk-${(p.severity || 'HIGH').toLowerCase()}`}
                      >
                        {p.severity}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 700 }}>
                      {p.entityValue}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>{p.description}</p>
                    {p.evidenceReferences && p.evidenceReferences.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
                        {p.evidenceReferences.map((ref, rIdx) => (
                          <span
                            key={rIdx}
                            style={{
                              background: 'rgba(255,255,255,0.06)',
                              fontSize: '0.68rem',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px',
                              fontFamily: 'monospace'
                            }}
                          >
                            {ref}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================
              DEDICATED VIEW: COMMUNITIES
             ============================================================ */}
          {activeView === 'COMMUNITIES' && (
            <div className="network-embedded-view">
              <h2 className="view-page-title">
                <span>👥</span> Louvain Community Clusters & Bridges
              </h2>
              <div className="pattern-cards-grid">
                {(analyticsData?.communities || []).map((c, idx) => (
                  <div key={idx} className="pattern-card" style={{ borderColor: 'rgba(192, 132, 252, 0.3)' }}>
                    <div className="pattern-card-head">
                      <span style={{ color: '#c084fc', fontWeight: 800, fontSize: '0.95rem' }}>
                        Community #{c.communityId}
                      </span>
                      <span className="pnx-comm-tag">{c.memberCount} Members</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                      Entities strongly interconnected in common communication or financial flow subgraphs.
                    </p>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                      {(c.members || []).map((m, mIdx) => (
                        <span
                          key={mIdx}
                          style={{
                            background: 'rgba(192, 132, 252, 0.1)',
                            border: '1px solid rgba(192, 132, 252, 0.25)',
                            fontSize: '0.72rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '6px',
                            fontFamily: 'monospace',
                            color: '#e2e8f0'
                          }}
                        >
                          {m.entityValue}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================
              DEDICATED VIEW: PREDICTIONS
             ============================================================ */}
          {activeView === 'PREDICTIONS' && (
            <div className="network-embedded-view">
              <h2 className="view-page-title">
                <span>🔮</span> Hidden Link Predictions (Jaccard & Adamic-Adar)
              </h2>
              <div className="prediction-cards-grid">
                {(analyticsData?.predictedLinks || []).map((pred, idx) => (
                  <div key={idx} className="prediction-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="ai-prediction-badge">AI-PREDICTED — NOT CONFIRMED</span>
                      <span style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: 700 }}>
                        Confidence: {pred.confidence || 'HIGH'}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(10,10,16,0.5)',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        fontFamily: 'monospace'
                      }}
                    >
                      <span style={{ fontWeight: 700, color: '#22d3ee' }}>{pred.entityAValue}</span>
                      <span style={{ color: '#94a3b8', fontSize: '1.1rem' }}>⟷</span>
                      <span style={{ fontWeight: 700, color: '#fbbf24' }}>{pred.entityBValue}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
                      <div>
                        <span style={{ color: '#64748b' }}>Jaccard:</span>{' '}
                        <strong style={{ color: '#f1f5f9' }}>{(pred.jaccardScore || 0).toFixed(2)}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Adamic:</span>{' '}
                        <strong style={{ color: '#f1f5f9' }}>{(pred.adamicAdarScore || 0).toFixed(2)}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#64748b' }}>Neighbors:</span>{' '}
                        <strong style={{ color: '#f1f5f9' }}>{pred.sharedNeighborsCount || 0}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================
              RIGHT-SIDE INTELLIGENCE INSPECTOR DRAWER
             ============================================================ */}
          {selectedItem && (
            <div className="network-drawer-panel">
              <div className="drawer-head-section">
                <h3 className="drawer-head-title">
                  <span>🔎</span> Entity Intelligence Profile
                </h3>
                <button className="drawer-close-btn" onClick={() => setSelectedItem(null)} type="button">
                  ✕
                </button>
              </div>

              <div className="drawer-content-body">
                {inspectLoading ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
                    <div className="state-spinner" style={{ margin: '0 auto 1rem' }} />
                    Loading intelligence profile...
                  </div>
                ) : selectedItem.type === 'node' ? (
                  <>
                    {/* Node Header Card */}
                    <div className="drawer-section-card">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="pnx-type-tag" style={{ fontSize: '0.8rem' }}>
                          {selectedItem.data?.entityType}
                        </span>
                        {selectedItem.data?.riskLevel && (
                          <span className={`pnx-risk-badge risk-${selectedItem.data.riskLevel.toLowerCase()}`}>
                            {selectedItem.data.riskLevel}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'monospace', color: '#ffffff' }}>
                        {selectedItem.data?.entityValue}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Role: {selectedItem.data?.roleClassification || 'Active Network Entity'}
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="drawer-metric-grid">
                      <div className="metric-pill-box">
                        <span className="metric-pill-label">Influence Score</span>
                        <span className="metric-pill-val" style={{ color: '#fbbf24' }}>
                          {entityIntel?.influenceScore
                            ? `${(entityIntel.influenceScore * 100).toFixed(1)}%`
                            : '—'}
                        </span>
                      </div>
                      <div className="metric-pill-box">
                        <span className="metric-pill-label">Prioritization Risk</span>
                        <span className="metric-pill-val" style={{ color: '#f87171' }}>
                          {entityIntel?.riskScore ? `${Math.round(entityIntel.riskScore)} / 100` : '—'}
                        </span>
                      </div>
                      <div className="metric-pill-box">
                        <span className="metric-pill-label">Degree Centrality</span>
                        <span className="metric-pill-val">
                          {entityIntel?.degreeCentrality ? entityIntel.degreeCentrality.toFixed(3) : '—'}
                        </span>
                      </div>
                      <div className="metric-pill-box">
                        <span className="metric-pill-label">Betweenness</span>
                        <span className="metric-pill-val">
                          {entityIntel?.betweennessCentrality
                            ? entityIntel.betweennessCentrality.toFixed(3)
                            : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Why This Entity Matters (Explainability) */}
                    <div className="drawer-section-card">
                      <span className="drawer-card-label">💡 Why This Entity Matters</span>
                      <p style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.5', margin: 0 }}>
                        {entityIntel?.explanation ||
                          'Maintains multi-modal connectivity across investigation communication records.'}
                      </p>
                      {entityIntel?.explanationFactors && entityIntel.explanationFactors.length > 0 && (
                        <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem', fontSize: '0.78rem', color: '#94a3b8' }}>
                          {entityIntel.explanationFactors.map((f, fIdx) => (
                            <li key={fIdx}>{f}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Connected Relationships */}
                    <div className="drawer-section-card">
                      <span className="drawer-card-label">
                        🔗 Connected Entities ({entityIntel?.connectedRelationships?.length || 0})
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {(entityIntel?.connectedRelationships || []).map((rel, rIdx) => (
                          <div
                            key={rIdx}
                            style={{
                              background: 'rgba(10,10,16,0.4)',
                              border: '1px solid rgba(255,255,255,0.05)',
                              borderRadius: '6px',
                              padding: '0.5rem 0.75rem',
                              fontSize: '0.78rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <span style={{ fontFamily: 'monospace', color: '#ffffff' }}>
                              {rel.targetEntityValue}
                            </span>
                            <span
                              style={{
                                color: rel.relationshipType === 'CALLED' ? '#22d3ee' : '#fbbf24',
                                fontWeight: 700
                              }}
                            >
                              {rel.relationshipType}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  /* Edge Inspector Card */
                  <div className="drawer-section-card">
                    <span className="drawer-card-label">🔗 Relationship Evidence</span>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#fbbf24' }}>
                      {selectedItem.data?.relationshipType}
                    </div>
                    {selectedItem.data?.weight && (
                      <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                        Weight / Value:{' '}
                        <strong>
                          {selectedItem.data.relationshipType === 'TRANSFERRED_TO'
                            ? `₹${Number(selectedItem.data.weight).toLocaleString('en-IN')}`
                            : `${selectedItem.data.weight}`}
                        </strong>
                      </div>
                    )}
                    {selectedItem.data?.sourceRecordId && (
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Source Record ID:{' '}
                        <span style={{ fontFamily: 'monospace' }}>{selectedItem.data.sourceRecordId}</span>
                      </div>
                    )}
                    {evidenceDetail && (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                        <div>Type: {evidenceDetail.type}</div>
                        <div>Date: {evidenceDetail.record?.callDate || evidenceDetail.record?.transactionDate || '—'}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
