"""
ProbNexus Prioritization Risk Scoring Engine
Calculates transparent 0-100 composite entity investigation risk scores
based on influence, bridging, communication volume, financial flow, and suspicious patterns.
"""

import networkx as nx
from typing import Dict, Any, List, Optional


def calculate_risk_scores(
    G: nx.Graph,
    entity_metrics: Dict[str, Any],
    communities_data: Dict[str, Any],
    suspicious_data: Dict[str, Any],
    raw_records: Optional[Dict[str, Any]] = None,
    weights: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Computes explainable, composite investigation prioritization risk score (0-100) for every entity.
    """
    num_nodes = G.number_of_nodes()
    
    if num_nodes == 0:
        return {"riskEntities": [], "riskSummary": {"critical": 0, "high": 0, "medium": 0, "low": 0}}

    weights = weights or {
        "influence": 0.30,
        "bridge": 0.20,
        "communication": 0.20,
        "financial": 0.20,
        "patterns": 0.10
    }

    raw_records = raw_records or {}
    calls = raw_records.get("calls", [])
    transactions = raw_records.get("transactions", [])

    # Calculate communication activity per entity
    phone_call_counts = {}
    for call in calls:
        cp = call.get("callerPhone")
        rp = call.get("receiverPhone")
        if cp:
            phone_call_counts[cp] = phone_call_counts.get(cp, 0) + 1
        if rp:
            phone_call_counts[rp] = phone_call_counts.get(rp, 0) + 1

    max_calls = max(phone_call_counts.values()) if phone_call_counts else 1

    # Calculate financial activity per entity
    account_amounts = {}
    for tx in transactions:
        try:
            amt = float(tx.get("amount", 0.0))
            s = tx.get("sender")
            r = tx.get("receiver")
            if s:
                account_amounts[s] = account_amounts.get(s, 0.0) + amt
            if r:
                account_amounts[r] = account_amounts.get(r, 0.0) + amt
        except (ValueError, TypeError):
            pass

    max_amount = max(account_amounts.values()) if account_amounts else 100000.0

    bridge_scores = {b["entityId"]: b.get("bridgeScore", 0.0) for b in communities_data.get("bridgeEntities", [])}
    pattern_scores = suspicious_data.get("entityPatternScores", {})
    patterns_by_entity = {}
    for p in suspicious_data.get("patterns", []):
        ent_id = p.get("entityId")
        if ent_id:
            patterns_by_entity.setdefault(ent_id, []).append(p)

    risk_entities = []
    risk_summary = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}

    for node in G.nodes():
        node_data = G.nodes[node]
        metric = entity_metrics.get(node, {})
        val = node_data.get("entityValue", "")
        norm_val = node_data.get("normalizedValue") or val
        ent_type = node_data.get("entityType", "UNKNOWN")

        # 1. Influence component (0..1)
        influence_val = metric.get("influenceScore", 0.0)
        
        # 2. Bridge component (0..1)
        bridge_val = bridge_scores.get(node, 0.0)
        
        # 3. Communication component (0..1)
        comm_count = phone_call_counts.get(val, 0) or phone_call_counts.get(norm_val, 0)
        # If not phone or no explicit calls, derive from graph degree for communication
        comm_val = (comm_count / max_calls) if ent_type == "PHONE" and max_calls > 0 else (metric.get("degreeCentrality", 0.0) * 0.5)

        # 4. Financial component (0..1)
        fin_amount = account_amounts.get(val, 0.0) or account_amounts.get(norm_val, 0.0)
        fin_val = min(1.0, fin_amount / max_amount) if ent_type == "ACCOUNT" and max_amount > 0 else 0.0

        # 5. Suspicious patterns component (0..1)
        pat_val = pattern_scores.get(node, 0.0)

        # Composite score (0..100)
        raw_composite = (
            weights["influence"] * influence_val +
            weights["bridge"] * bridge_val +
            weights["communication"] * comm_val +
            weights["financial"] * fin_val +
            weights["patterns"] * pat_val
        )
        
        # Scale to 0-100
        score_100 = round(min(100.0, max(0.0, raw_composite * 100.0)), 1)

        # Categorize risk level
        if score_100 >= 80:
            level = "CRITICAL"
        elif score_100 >= 60:
            level = "HIGH"
        elif score_100 >= 30:
            level = "MEDIUM"
        else:
            level = "LOW"

        risk_summary[level] += 1

        risk_entities.append({
            "entityId": node,
            "entityType": ent_type,
            "entityValue": val,
            "normalizedValue": norm_val,
            "riskScore": score_100,
            "riskLevel": level,
            "breakdown": {
                "influence": round(influence_val * 100, 1),
                "bridge": round(bridge_val * 100, 1),
                "communication": round(comm_val * 100, 1),
                "financial": round(fin_val * 100, 1),
                "patterns": round(pat_val * 100, 1)
            },
            "formula": "0.30*influence + 0.20*bridge + 0.20*comm + 0.20*fin + 0.10*patterns",
            "patternCount": len(patterns_by_entity.get(node, [])),
            "patterns": patterns_by_entity.get(node, []),
            "communityId": communities_data.get("nodeCommunities", {}).get(node, 1)
        })

    # Sort descending by risk score
    risk_entities.sort(key=lambda x: x["riskScore"], reverse=True)

    # Assign risk ranks
    for r_idx, item in enumerate(risk_entities, start=1):
        item["rank"] = r_idx

    return {
        "riskEntities": risk_entities,
        "riskSummary": risk_summary
    }
