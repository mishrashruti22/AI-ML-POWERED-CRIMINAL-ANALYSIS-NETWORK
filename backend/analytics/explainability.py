"""
ProbNexus Explainability Engine (SIH Step 8)
Generates evidence-backed, factual, human-readable intelligence explanations
linking all AI findings to concrete data baselines, communities, and investigation
source records.

CRITICAL RULES:
- Every explanation must be traceable to actual computed values.
- No fabricated text. If a factor does not exist in the data, do NOT mention it.
- The system must NOT make legal determinations.
- Use "investigation lead", "suspicious pattern", "requires further investigation".
"""

from typing import Dict, Any, List, Optional


def _resolve_evidence_display_ids(source_record_ids: List[str], raw_records: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    Resolve UUID source record IDs to human-readable evidence display IDs and types.
    Uses firNumber, transactionReference, or short UUID prefix for calls.
    """
    if not source_record_ids or not raw_records:
        return []

    firs = {r["id"]: r for r in raw_records.get("firs", []) if r.get("id")}
    calls = {r["id"]: r for r in raw_records.get("calls", []) if r.get("id")}
    transactions = {r["id"]: r for r in raw_records.get("transactions", []) if r.get("id")}

    resolved = []
    seen = set()
    for rid in source_record_ids:
        if not rid or rid in seen:
            continue
        seen.add(rid)

        if rid in firs:
            fir = firs[rid]
            display = fir.get("firNumber") or f"FIR-{rid[:6].upper()}"
            resolved.append({"id": rid, "displayId": display, "type": "FIR",
                              "detail": fir.get("description", "")[:80] if fir.get("description") else ""})
        elif rid in calls:
            call = calls[rid]
            display = f"CDR-{rid[:6].upper()}"
            resolved.append({"id": rid, "displayId": display, "type": "CDR",
                              "detail": f"{call.get('callerPhone', '')} → {call.get('receiverPhone', '')}"})
        elif rid in transactions:
            tx = transactions[rid]
            display = tx.get("transactionReference") or f"TXN-{rid[:6].upper()}"
            resolved.append({"id": rid, "displayId": display, "type": "TRANSACTION",
                              "detail": f"{tx.get('sender', '')} → {tx.get('receiver', '')} ₹{tx.get('amount', 0)}"})
        else:
            # Unknown type — use short prefix
            resolved.append({"id": rid, "displayId": f"REC-{rid[:6].upper()}", "type": "RECORD", "detail": ""})

    return resolved


def _detect_financial_chain(G, node: str, max_depth: int = 4) -> Optional[Dict[str, Any]]:
    """
    Traces multi-hop ACCOUNT->ACCOUNT transaction chains starting from `node`.
    Returns chain details if a path of 2+ hops exists, else None.
    """
    if G.nodes[node].get("entityType") != "ACCOUNT":
        return None

    best_chain = []
    best_total = 0.0
    visited = set()

    def dfs(current, path, total_amount, depth):
        nonlocal best_chain, best_total
        if depth > max_depth:
            return
        for nbr in G.neighbors(current):
            if nbr in visited:
                continue
            edge_data = G[current][nbr]
            if edge_data.get("relationshipType") != "TRANSFERRED_TO":
                continue
            if G.nodes[nbr].get("entityType") != "ACCOUNT":
                continue
            weight = float(edge_data.get("weight", 0.0))
            new_path = path + [nbr]
            new_total = total_amount + weight
            if len(new_path) >= 2 and new_total > best_total:
                best_chain = new_path
                best_total = new_total
            visited.add(nbr)
            dfs(nbr, new_path, new_total, depth + 1)
            visited.discard(nbr)

    visited.add(node)
    dfs(node, [node], 0.0, 0)

    if len(best_chain) >= 3:  # at least 2 hops: A -> B -> C
        chain_values = [G.nodes[n].get("entityValue", n) for n in best_chain]
        return {
            "chain": chain_values,
            "hopCount": len(best_chain) - 1,
            "totalAmount": round(best_total, 2),
            "chainText": " → ".join(chain_values),
            "currencySymbol": "₹"
        }
    return None


def generate_explanations(
    G,
    entity_metrics: Dict[str, Any],
    communities_data: Dict[str, Any],
    suspicious_data: Dict[str, Any],
    risk_data: Dict[str, Any],
    prediction_data: Dict[str, Any],
    raw_records: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Constructs factual, transparent explanations for all flagged entities, key players,
    and predictions. Every factor is derived from actual computed values.
    """
    explanations = []
    entity_explanations_map = {}

    raw_records = raw_records or {}
    baselines = suspicious_data.get("baselines", {})
    mean_deg = baselines.get("meanDegree", 0.0)
    node_to_comm = communities_data.get("nodeCommunities", {})
    bridge_map = {b["entityId"]: b for b in communities_data.get("bridgeEntities", [])}
    patterns_map: Dict[str, list] = {}
    for p in suspicious_data.get("patterns", []):
        eid = p.get("entityId")
        if eid:
            patterns_map.setdefault(eid, []).append(p)

    # Predicted links per entity
    pred_map: Dict[str, list] = {}
    for pred in prediction_data.get("predictedLinks", []):
        for side in ("entityAId", "entityBId"):
            eid = pred.get(side)
            if eid:
                pred_map.setdefault(eid, []).append(pred)

    for r_entity in risk_data.get("riskEntities", []):
        ent_id = r_entity["entityId"]
        ent_val = r_entity["entityValue"]
        ent_type = r_entity["entityType"]
        risk_score = r_entity["riskScore"]
        risk_level = r_entity["riskLevel"]
        breakdown = r_entity.get("breakdown", {})

        metric = entity_metrics.get(ent_id, {})
        deg = metric.get("degree", 0)
        inf = metric.get("influenceScore", 0.0)
        bet_c = metric.get("betweennessCentrality", 0.0)
        deg_c = metric.get("degreeCentrality", 0.0)
        comm_id = node_to_comm.get(ent_id, 1)

        # ── Structured factors list ──────────────────────────────────
        factors = []
        source_rec_ids = set()

        # Factor 1: Degree / Connectivity
        if deg >= 2 and deg > mean_deg:
            factors.append({
                "type": "HIGH_CONNECTIVITY",
                "icon": "🔗",
                "label": "High Connectivity",
                "value": f"{deg} direct connections",
                "description": f"Maintains {deg} direct connections (network baseline average: {round(mean_deg, 1)}).",
                "metric": {"degree": deg, "meanDegree": round(mean_deg, 1)}
            })
        elif deg >= 1:
            factors.append({
                "type": "ACTIVE_PARTICIPANT",
                "icon": "🔗",
                "label": "Active Network Member",
                "value": f"{deg} connection(s)",
                "description": f"Participates with {deg} connection(s) in the investigation network.",
                "metric": {"degree": deg}
            })

        # Factor 2: Influence / Betweenness
        if inf >= 0.4:
            factors.append({
                "type": "HIGH_INFLUENCE",
                "icon": "⭐",
                "label": "High Influence Score",
                "value": f"{round(inf * 100, 1)}%",
                "description": f"Ranks as a high-influence network entity (influence score: {round(inf, 4)}).",
                "metric": {"influenceScore": round(inf, 4), "degreeCentrality": round(deg_c, 4)}
            })
        elif inf >= 0.15:
            factors.append({
                "type": "MODERATE_INFLUENCE",
                "icon": "📊",
                "label": "Moderate Influence",
                "value": f"{round(inf * 100, 1)}%",
                "description": f"Has moderate network influence (score: {round(inf, 4)}).",
                "metric": {"influenceScore": round(inf, 4)}
            })

        if bet_c >= 0.2:
            factors.append({
                "type": "HIGH_BETWEENNESS",
                "icon": "🌉",
                "label": "High Betweenness Centrality",
                "value": f"{round(bet_c, 4)}",
                "description": f"Acts as a critical intermediary pathway (betweenness centrality: {round(bet_c, 4)}). "
                               f"Removing this entity would fragment information flow.",
                "metric": {"betweennessCentrality": round(bet_c, 4)}
            })

        # Factor 3: Community Bridging
        if ent_id in bridge_map:
            b_info = bridge_map[ent_id]
            connected_c = b_info.get("connectedCommunities", [])
            if len(connected_c) > 1:
                comm_labels = [f"Community {c}" for c in connected_c]
                factors.append({
                    "type": "COMMUNITY_BRIDGE",
                    "icon": "🌉",
                    "label": "Community Bridge Detected",
                    "value": f"Connects {len(connected_c)} communities",
                    "description": f"Acts as a bridge between {', '.join(comm_labels)}, enabling flow of "
                                   f"communication or financial activity across separate network groups.",
                    "metric": {
                        "communityId": comm_id,
                        "connectedCommunities": connected_c,
                        "bridgeScore": round(b_info.get("bridgeScore", 0.0), 4)
                    },
                    "bridgeDetails": {
                        "connectedCommunities": comm_labels,
                        "bridgeScore": round(b_info.get("bridgeScore", 0.0), 4)
                    }
                })

        # Factor 4: Suspicious patterns
        entity_patterns = patterns_map.get(ent_id, [])
        for pat in entity_patterns:
            for s_id in pat.get("sourceRecordIds", []):
                if s_id:
                    source_rec_ids.add(s_id)

            pat_type = pat.get("patternType", "")
            if pat_type == "HIGH_VOLUME_FINANCIAL_ACTIVITY":
                factors.append({
                    "type": "FINANCIAL_VOLUME",
                    "icon": "💰",
                    "label": "High Financial Activity",
                    "value": pat.get("evidence", "Exceeds baseline"),
                    "description": pat.get("description", "Participates in cumulative financial transactions significantly exceeding the network baseline."),
                    "metric": pat.get("metrics", {})
                })
            elif pat_type == "HIGH_VALUE_TRANSACTION":
                factors.append({
                    "type": "HIGH_VALUE_TX",
                    "icon": "💸",
                    "label": "High-Value Transaction",
                    "value": pat.get("evidence", "Single high-value transfer"),
                    "description": pat.get("description", "Initiated a high-value single transaction above normal investigation thresholds."),
                    "metric": pat.get("metrics", {})
                })
            elif pat_type == "REPEATED_COMMUNICATION":
                factors.append({
                    "type": "REPEATED_CALLS",
                    "icon": "📞",
                    "label": "Repeated Communication Pattern",
                    "value": pat.get("evidence", "Frequent calls detected"),
                    "description": pat.get("description", "Shows frequent repeated call activity with key contacts."),
                    "metric": pat.get("metrics", {})
                })
            elif pat_type == "RAPID_TRANSACTION_CHAIN":
                factors.append({
                    "type": "TX_CHAIN",
                    "icon": "⛓",
                    "label": "Multi-Hop Transaction Chain",
                    "value": pat.get("evidence", "Transaction chain conduit"),
                    "description": pat.get("description", "Functions as a conduit node in a multi-hop financial transfer chain."),
                    "metric": pat.get("metrics", {})
                })
            elif pat_type == "HIGH_CONNECTIVITY_HUB":
                factors.append({
                    "type": "HIGH_CONNECTIVITY_HUB",
                    "icon": "🕸",
                    "label": "Connectivity Hub",
                    "value": pat.get("evidence", ""),
                    "description": pat.get("description", ""),
                    "metric": pat.get("metrics", {})
                })
            elif pat_type == "CROSS_COMMUNITY_BRIDGE":
                pass  # Already captured above from bridge_map

        # Factor 5: Financial chain (multi-hop ACCOUNT path)
        fin_chain = _detect_financial_chain(G, ent_id)
        if fin_chain:
            factors.append({
                "type": "FINANCIAL_CHAIN",
                "icon": "⛓",
                "label": "Multi-Hop Financial Chain",
                "value": f"{fin_chain['hopCount']} hops · {fin_chain['currencySymbol']}{fin_chain['totalAmount']:,.0f} total",
                "description": (
                    f"Funds observed moving through {fin_chain['hopCount']} intermediary hop(s): "
                    f"{fin_chain['chainText']}. Total observed: "
                    f"{fin_chain['currencySymbol']}{fin_chain['totalAmount']:,.2f}."
                ),
                "metric": {
                    "chainText": fin_chain["chainText"],
                    "hopCount": fin_chain["hopCount"],
                    "totalAmount": fin_chain["totalAmount"]
                }
            })

        # Collect edge source records
        if G.has_node(ent_id):
            for nbr in G.neighbors(ent_id):
                for sid in G[ent_id][nbr].get("sourceRecordIds", []):
                    if sid:
                        source_rec_ids.add(sid)

        # Resolve evidence IDs to human-readable display IDs
        evidence_display = _resolve_evidence_display_ids(sorted(list(source_rec_ids)), raw_records)

        # ── Natural language explanation ─────────────────────────────
        if not factors or (len(factors) == 1 and deg < 2):
            # Insufficient evidence fallback
            full_text = (
                f"Limited network data available for this entity (degree: {deg}, risk score: {risk_score}/100). "
                f"The entity is present within Community {comm_id} with minimal direct connections. "
                f"Insufficient evidence for a high-confidence explanation."
            )
            insufficient = True
        else:
            factor_descs = [f["description"] for f in factors]
            full_text = (
                f"{ent_val} has been identified as a {risk_level.lower()}-priority investigation lead "
                f"(risk score: {risk_score}/100) within Community {comm_id}. "
            )
            if len(factor_descs) == 1:
                full_text += factor_descs[0]
            elif len(factor_descs) == 2:
                full_text += f"{factor_descs[0]} Additionally, {factor_descs[1].lower()}"
            else:
                full_text += (
                    "Multiple indicators contributed to this assessment: "
                    + "; ".join(f["label"] for f in factors) + ". "
                )
                full_text += factor_descs[0]
            insufficient = False

        # ── Bridge explanation text ──────────────────────────────────
        bridge_explanation = None
        if ent_id in bridge_map:
            b_info = bridge_map[ent_id]
            connected_c = b_info.get("connectedCommunities", [])
            if len(connected_c) > 1:
                bridge_explanation = (
                    f"This entity has relationships with members of multiple detected communities "
                    f"({', '.join(f'Community {c}' for c in connected_c)}) and has a betweenness centrality "
                    f"of {round(bet_c, 4)}, indicating a potential bridging role in the network."
                )

        explanation_item = {
            "entityId": ent_id,
            "entityValue": ent_val,
            "entityType": ent_type,
            "riskLevel": risk_level,
            "riskScore": risk_score,
            "riskBreakdown": breakdown,
            "communityId": comm_id,
            "communityName": f"Community {comm_id}",
            "isBridge": ent_id in bridge_map,
            "bridgeExplanation": bridge_explanation,
            "explanationType": "ENTITY_PRIORITIZATION",
            "explanationText": full_text,
            "insufficientEvidence": insufficient,
            "factors": factors,
            "supportingData": {
                "degree": deg,
                "degreeCentrality": round(deg_c, 4),
                "betweennessCentrality": round(bet_c, 4),
                "influenceScore": round(inf, 4),
                "communityId": comm_id,
                "patternCount": len(entity_patterns),
                "meanDegree": round(mean_deg, 2),
                "riskBreakdown": breakdown
            },
            "sourceRecordIds": sorted(list(source_rec_ids)),
            "evidenceDisplay": evidence_display,
            "suspiciousPatterns": entity_patterns,
            "predictedLinks": pred_map.get(ent_id, []),
            "financialChain": fin_chain
        }

        explanations.append(explanation_item)
        entity_explanations_map[ent_id] = explanation_item

    return {
        "explanations": explanations,
        "entityExplanations": entity_explanations_map
    }
