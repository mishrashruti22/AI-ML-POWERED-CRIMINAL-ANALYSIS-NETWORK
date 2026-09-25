/**
 * ============================================================
 * PROBNEXUS — PREMIUM INVESTIGATION ENTITY NODE
 * ============================================================
 * Visually rich criminal network graph node with:
 *   - Type-specific colors & icons (Phone: Cyan, Account: Amber, Location: Magenta, Person: Crimson)
 *   - Key Player visual emphasis (larger scale, gold star badge, gold aura glow)
 *   - Cross-Community Bridge Node indicator ring
 *   - Louvain Community color family badge
 *   - Prioritization Risk pill badge
 *   - Multi-directional handles for clean edge routing
 * ============================================================
 */

import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const EntityNode = ({ data, selected }) => {
  const {
    entityType,
    entityValue,
    normalizedValue,
    isHighlighted,
    riskLevel,
    riskScore,
    influenceScore,
    rank,
    communityId,
    isBridge,
    roleClassification,
    connectionCount
  } = data;

  // Type configuration with icons, labels, and color tokens
  const getTypeConfig = (type) => {
    switch (type) {
      case 'PHONE':
        return {
          icon: '📱',
          typeLabel: 'PHONE',
          typeClass: 'entity-phone',
          avatarBg: 'rgba(6, 182, 212, 0.15)',
          avatarBorder: '#06b6d4',
          accentColor: '#22d3ee'
        };
      case 'ACCOUNT':
        return {
          icon: '💳',
          typeLabel: 'ACCOUNT',
          typeClass: 'entity-account',
          avatarBg: 'rgba(245, 158, 11, 0.15)',
          avatarBorder: '#f59e0b',
          accentColor: '#fbbf24'
        };
      case 'LOCATION':
        return {
          icon: '📍',
          typeLabel: 'LOCATION',
          typeClass: 'entity-location',
          avatarBg: 'rgba(236, 72, 153, 0.15)',
          avatarBorder: '#ec4899',
          accentColor: '#f472b6'
        };
      case 'PERSON':
        return {
          icon: '👤',
          typeLabel: 'PERSON',
          typeClass: 'entity-person',
          avatarBg: 'rgba(239, 68, 68, 0.15)',
          avatarBorder: '#ef4444',
          accentColor: '#f87171'
        };
      case 'ORGANIZATION':
        return {
          icon: '🏢',
          typeLabel: 'ORGANIZATION',
          typeClass: 'entity-org',
          avatarBg: 'rgba(168, 85, 247, 0.15)',
          avatarBorder: '#a855f7',
          accentColor: '#c084fc'
        };
      default:
        return {
          icon: '🏷️',
          typeLabel: type || 'ENTITY',
          typeClass: 'entity-default',
          avatarBg: 'rgba(148, 163, 184, 0.15)',
          avatarBorder: '#94a3b8',
          accentColor: '#cbd5e1'
        };
    }
  };

  const config = getTypeConfig(entityType);
  const isKeyPlayer = rank && rank <= 3;

  // Louvain Community Color Family Classes
  const getCommunityClass = (cId) => {
    const classes = ['comm-halo-1', 'comm-halo-2', 'comm-halo-3', 'comm-halo-4', 'comm-halo-5'];
    return classes[((cId || 1) - 1) % classes.length];
  };

  return (
    <div
      className={`pnx-investigation-node ${config.typeClass} ${
        selected ? 'is-selected' : ''
      } ${isHighlighted ? 'is-highlighted' : ''} ${
        isKeyPlayer ? 'is-key-player' : ''
      } ${isBridge ? 'is-bridge-node' : ''} ${
        communityId ? getCommunityClass(communityId) : ''
      }`}
    >
      {/* 8 Cardinal & Diagonal Connection Handles */}
      <Handle type="target" position={Position.Top} className="pnx-node-handle" id="t-in" />
      <Handle type="source" position={Position.Top} className="pnx-node-handle" id="t-out" />
      <Handle type="target" position={Position.Bottom} className="pnx-node-handle" id="b-in" />
      <Handle type="source" position={Position.Bottom} className="pnx-node-handle" id="b-out" />
      <Handle type="target" position={Position.Left} className="pnx-node-handle" id="l-in" />
      <Handle type="source" position={Position.Left} className="pnx-node-handle" id="l-out" />
      <Handle type="target" position={Position.Right} className="pnx-node-handle" id="r-in" />
      <Handle type="source" position={Position.Right} className="pnx-node-handle" id="r-out" />

      {/* Bridge Node Outer Pulse Ring */}
      {isBridge && <div className="pnx-bridge-halo" title="Cross-Community Bridge Entity" />}

      {/* Key Player Crown / Gold Star Badge */}
      {isKeyPlayer && (
        <div className="pnx-key-player-badge" title={`Key Network Influencer Rank #${rank}`}>
          <span>★</span> KEY PLAYER #{rank}
        </div>
      )}

      {/* Main Node Card Body */}
      <div className="pnx-node-card">
        {/* Header Row: Type Icon Avatar + Badges */}
        <div className="pnx-node-header">
          <div className="pnx-node-avatar" style={{ background: config.avatarBg, borderColor: config.avatarBorder }}>
            <span className="pnx-avatar-icon">{config.icon}</span>
          </div>

          <div className="pnx-node-meta">
            <span className="pnx-type-tag" style={{ color: config.accentColor }}>
              {config.typeLabel}
            </span>
            {communityId && (
              <span className="pnx-comm-tag" title={`Louvain Community ${communityId}`}>
                C{communityId}
              </span>
            )}
          </div>
        </div>

        {/* Entity Value & Subtext */}
        <div className="pnx-node-body">
          <div className="pnx-entity-value" title={entityValue}>
            {entityValue}
          </div>
          {normalizedValue && normalizedValue !== entityValue && (
            <div className="pnx-entity-normalized" title={`Normalized: ${normalizedValue}`}>
              {normalizedValue}
            </div>
          )}
        </div>

        {/* Footer Intelligence Indicators */}
        <div className="pnx-node-footer">
          {riskLevel && (
            <span
              className={`pnx-risk-badge risk-${riskLevel.toLowerCase()}`}
              title={`Prioritization Risk: ${riskLevel} (${riskScore ? Math.round(riskScore) : 0}/100)`}
            >
              {riskLevel === 'CRITICAL' ? '● CRITICAL' : riskLevel === 'HIGH' ? '▲ HIGH' : riskLevel === 'MEDIUM' ? '◆ MED' : '○ LOW'}
            </span>
          )}

          {isBridge && (
            <span className="pnx-bridge-badge" title="Bridge node linking different network clusters">
              🌉 BRIDGE
            </span>
          )}

          {connectionCount !== undefined && connectionCount > 0 && (
            <span className="pnx-conn-badge" title={`${connectionCount} direct connections`}>
              🔗 {connectionCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(EntityNode);
