"""
ProbNexus Suspicious Activity & Anomaly Detection Engine
Implements statistical baselines and explainable heuristic anomaly rules
across call records, financial transactions, and network graph patterns.

Each pattern returned includes:
  - evidenceReferences: human-readable IDs (firNumber / CDR-xxxxx / transactionReference)
  - metrics: actual values that triggered detection
  - whyDetected: natural language explanation from real values (NOT hardcoded)
"""

import networkx as nx
import numpy as np
from typing import Dict, Any, List, Optional


def _resolve_pattern_evidence(source_record_ids: List[str], raw_records: Dict[str, Any]) -> List[str]:
    """
    Resolve UUID record IDs to human-readable display labels for each pattern.
    Returns a list of display strings like 'FIR-2024/001', 'CDR-A1B2C3', 'TXN-REF001'.
    """
    if not source_record_ids or not raw_records:
        return []

    firs = {r["id"]: r for r in raw_records.get("firs", []) if r.get("id")}
    calls = {r["id"]: r for r in raw_records.get("calls", []) if r.get("id")}
    transactions = {r["id"]: r for r in raw_records.get("transactions", []) if r.get("id")}

    result = []
    seen = set()
    for rid in source_record_ids:
        if not rid or rid in seen:
            continue
        seen.add(rid)
        if rid in firs:
            label = firs[rid].get("firNumber") or f"FIR-{rid[:6].upper()}"
        elif rid in calls:
            label = f"CDR-{rid[:6].upper()}"
        elif rid in transactions:
            label = transactions[rid].get("transactionReference") or f"TXN-{rid[:6].upper()}"
        else:
            label = f"REC-{rid[:6].upper()}"
        result.append(label)

    return result



def detect_suspicious_patterns(
    G: nx.Graph,
    entity_metrics: Dict[str, Any],
    communities_data: Dict[str, Any],
    raw_records: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Detects anomalous activity patterns based on graph topology, communication frequency,
    and financial transaction volume against statistical network baselines.
    """
    patterns = []
    num_nodes = G.number_of_nodes()
    
    if num_nodes == 0:
        return {"patterns": [], "baselines": {}, "entityPatternScores": {}}

    raw_records = raw_records or {}
    calls = raw_records.get("calls", [])
    transactions = raw_records.get("transactions", [])
    firs = raw_records.get("firs", [])

    # ─────────────────────────────────────────────────────────────
    # 1. STATISTICAL BASELINES CALCULATION
    # ─────────────────────────────────────────────────────────────
    degrees = [G.degree(n) for n in G.nodes()]
    mean_degree = float(np.mean(degrees)) if degrees else 0.0
    std_degree = float(np.std(degrees)) if len(degrees) > 1 else 0.0
    median_degree = float(np.median(degrees)) if degrees else 0.0

    tx_amounts = []
    for tx in transactions:
        try:
            amt = float(tx.get("amount", 0.0))
            if amt > 0:
                tx_amounts.append(amt)
        except (ValueError, TypeError):
            pass

    mean_tx_amount = float(np.mean(tx_amounts)) if tx_amounts else 0.0
    std_tx_amount = float(np.std(tx_amounts)) if len(tx_amounts) > 1 else 0.0
    median_tx_amount = float(np.median(tx_amounts)) if tx_amounts else 0.0
    max_tx_amount = float(np.max(tx_amounts)) if tx_amounts else 0.0

    baselines = {
        "meanDegree": round(mean_degree, 2),
        "stdDegree": round(std_degree, 2),
        "medianDegree": round(median_degree, 2),
        "totalNodes": num_nodes,
        "totalEdges": G.number_of_edges(),
        "totalTransactions": len(transactions),
        "totalCalls": len(calls),
        "meanTxAmount": round(mean_tx_amount, 2),
        "medianTxAmount": round(median_tx_amount, 2),
        "maxTxAmount": round(max_tx_amount, 2)
    }

    node_to_comm = communities_data.get("nodeCommunities", {})
    bridge_entities = {b["entityId"]: b for b in communities_data.get("bridgeEntities", [])}

    # ─────────────────────────────────────────────────────────────
    # 2. PATTERN 1: HIGH CONNECTIVITY HUB (Degree Outlier)
    # ─────────────────────────────────────────────────────────────
    # In small networks (e.g. 8 nodes), std might be small, so threshold adapts
    high_conn_threshold = max(2, mean_degree + (1.0 * std_degree if std_degree > 0 else 1.0))
    for node in G.nodes():
        deg = G.degree(node)
        metric = entity_metrics.get(node, {})
        if deg >= high_conn_threshold:
            # Collect edge source record IDs
            rec_ids = []
            for nbr in G.neighbors(node):
                rec_ids.extend(G[node][nbr].get("sourceRecordIds", []))
            
            severity = "HIGH" if deg >= (mean_degree + 2 * std_degree if std_degree > 0 else 3) else "MEDIUM"
            patterns.append({
                "patternType": "HIGH_CONNECTIVITY_HUB",
                "severity": severity,
                "entityId": node,
                "entityType": G.nodes[node].get("entityType", "UNKNOWN"),
                "entityValue": G.nodes[node].get("entityValue", ""),
                "description": f"Entity maintains {deg} active connections, significantly exceeding network baseline average of {round(mean_degree, 1)}.",
                "evidence": f"Degree: {deg} (Baseline avg: {round(mean_degree, 1)}, median: {round(median_degree, 1)})",
                "score": round(min(1.0, deg / max(1, num_nodes - 1)), 2),
                "sourceRecordIds": list(set(rec_ids))
            })

    # ─────────────────────────────────────────────────────────────
    # 3. PATTERN 2: CROSS-COMMUNITY BRIDGE
    # ─────────────────────────────────────────────────────────────
    for node, bridge_info in bridge_entities.items():
        if len(bridge_info.get("connectedCommunities", [])) > 1:
            rec_ids = []
            for nbr in G.neighbors(node):
                rec_ids.extend(G[node][nbr].get("sourceRecordIds", []))

            patterns.append({
                "patternType": "CROSS_COMMUNITY_BRIDGE",
                "severity": "HIGH",
                "entityId": node,
                "entityType": bridge_info.get("entityType", "UNKNOWN"),
                "entityValue": bridge_info.get("entityValue", ""),
                "description": f"Entity operates as an active bridge linking separate network clusters: {', '.join('Community ' + str(c) for c in bridge_info['connectedCommunities'])}.",
                "evidence": f"Bridge score: {bridge_info.get('bridgeScore')}, Betweenness: {bridge_info.get('betweennessCentrality')}",
                "score": bridge_info.get("bridgeScore", 0.75),
                "sourceRecordIds": list(set(rec_ids))
            })

    # ─────────────────────────────────────────────────────────────
    # 4. PATTERN 3 & 6: FINANCIAL ANOMALIES (High Volume & High Value Outlier)
    # ─────────────────────────────────────────────────────────────
    # Map entity accounts to transactions
    account_volumes = {}
    account_records = {}
    for tx in transactions:
        amt = float(tx.get("amount", 0.0))
        tx_id = tx.get("id")
        sender = str(tx.get("sender", ""))
        receiver = str(tx.get("receiver", ""))

        for acc in [sender, receiver]:
            if acc:
                account_volumes[acc] = account_volumes.get(acc, 0.0) + amt
                if tx_id:
                    account_records.setdefault(acc, []).append(tx_id)

    # Match accounts with graph nodes
    for node in G.nodes():
        node_data = G.nodes[node]
        if node_data.get("entityType") == "ACCOUNT":
            norm_val = node_data.get("normalizedValue") or node_data.get("entityValue")
            # Find matching volume
            vol = account_volumes.get(norm_val, 0.0) or account_volumes.get(node_data.get("entityValue"), 0.0)
            recs = account_records.get(norm_val, []) or account_records.get(node_data.get("entityValue"), [])

            if vol > 0 and mean_tx_amount > 0:
                if vol >= (mean_tx_amount * 1.5) or vol >= 50000:
                    severity = "CRITICAL" if vol >= 100000 else "HIGH"
                    patterns.append({
                        "patternType": "HIGH_VOLUME_FINANCIAL_ACTIVITY",
                        "severity": severity,
                        "entityId": node,
                        "entityType": "ACCOUNT",
                        "entityValue": node_data.get("entityValue", ""),
                        "description": f"Account processed cumulative transaction volume of ₹{vol:,.2f}, surpassing standard investigation threshold.",
                        "evidence": f"Cumulative volume: ₹{vol:,.2f} across {len(recs)} transactions (Mean: ₹{mean_tx_amount:,.2f})",
                        "score": round(min(1.0, vol / max(100000.0, max_tx_amount)), 2),
                        "sourceRecordIds": list(set(recs))
                    })

    # Individual high value transactions
    for tx in transactions:
        amt = float(tx.get("amount", 0.0))
        tx_id = tx.get("id")
        if amt >= 50000 or (mean_tx_amount > 0 and amt >= mean_tx_amount * 1.8):
            # Find node for sender or receiver
            sender = tx.get("sender")
            for node in G.nodes():
                if G.nodes[node].get("entityValue") == sender or G.nodes[node].get("normalizedValue") == sender:
                    patterns.append({
                        "patternType": "HIGH_VALUE_TRANSACTION",
                        "severity": "HIGH",
                        "entityId": node,
                        "entityType": "ACCOUNT",
                        "entityValue": G.nodes[node].get("entityValue", ""),
                        "description": f"Account initiated high-value single transaction of ₹{amt:,.2f} exceeding standard baseline.",
                        "evidence": f"Single transfer: ₹{amt:,.2f}, Transaction Ref: {tx.get('transactionReference', 'N/A')}",
                        "score": round(min(1.0, amt / 100000.0), 2),
                        "sourceRecordIds": [tx_id] if tx_id else []
                    })

    # ─────────────────────────────────────────────────────────────
    # 5. PATTERN 4: REPEATED CALLS / FREQUENT COMMUNICATIONS
    # ─────────────────────────────────────────────────────────────
    call_pairs = {}
    for call in calls:
        c1 = call.get("callerPhone")
        c2 = call.get("receiverPhone")
        cid = call.get("id")
        if c1 and c2:
            pair = tuple(sorted([c1, c2]))
            call_pairs.setdefault(pair, []).append(cid)

    for (p1, p2), rec_list in call_pairs.items():
        if len(rec_list) >= 2:
            # Locate node IDs
            for node in G.nodes():
                val = G.nodes[node].get("entityValue")
                norm = G.nodes[node].get("normalizedValue")
                if val in (p1, p2) or norm in (p1, p2):
                    patterns.append({
                        "patternType": "REPEATED_COMMUNICATION",
                        "severity": "MEDIUM",
                        "entityId": node,
                        "entityType": "PHONE",
                        "entityValue": val,
                        "description": f"Frequent direct communication observed between {p1} and {p2} ({len(rec_list)} recorded calls).",
                        "evidence": f"{len(rec_list)} CDR call records identified",
                        "score": round(min(1.0, len(rec_list) / 5.0), 2),
                        "sourceRecordIds": rec_list
                    })

    # ─────────────────────────────────────────────────────────────
    # 6. PATTERN 5: RAPID TRANSACTION CHAINS (Multi-hop transfers)
    # ─────────────────────────────────────────────────────────────
    account_graph = nx.DiGraph()
    for tx in transactions:
        s = tx.get("sender")
        r = tx.get("receiver")
        if s and r:
            account_graph.add_edge(s, r, recordId=tx.get("id"))

    # Check for paths of length >= 2
    for s_node in account_graph.nodes():
        for t_node in account_graph.nodes():
            if s_node != t_node and nx.has_path(account_graph, s_node, t_node):
                for path in nx.all_simple_paths(account_graph, s_node, t_node, cutoff=3):
                    if len(path) >= 3:
                        # Found chain: path[0] -> path[1] -> path[2]
                        chain_str = " → ".join(path)
                        chain_recs = []
                        for i in range(len(path) - 1):
                            edge_rec = account_graph[path[i]][path[i+1]].get("recordId")
                            if edge_rec:
                                chain_recs.append(edge_rec)

                        # Flag intermediate and source nodes
                        for member in path:
                            for n in G.nodes():
                                if G.nodes[n].get("entityValue") == member:
                                    patterns.append({
                                        "patternType": "RAPID_TRANSACTION_CHAIN",
                                        "severity": "HIGH",
                                        "entityId": n,
                                        "entityType": "ACCOUNT",
                                        "entityValue": member,
                                        "description": f"Participates in layered transaction chain: {chain_str}.",
                                        "evidence": f"Multi-hop fund transfer across {len(path)} accounts",
                                        "score": 0.85,
                                        "sourceRecordIds": chain_recs
                                    })
                                    break
                        break  # flag once per pair

    # ─────────────────────────────────────────────────────────────
    # 7. PATTERN 8: HIGH INFLUENCE + SUSPICIOUS ACTIVITY COMBINATION
    # ─────────────────────────────────────────────────────────────
    flagged_entity_ids = {p["entityId"] for p in patterns if p.get("entityId")}
    for node in G.nodes():
        metric = entity_metrics.get(node, {})
        inf = metric.get("influenceScore", 0.0)
        if inf >= 0.45 and node in flagged_entity_ids:
            rec_ids = []
            for nbr in G.neighbors(node):
                rec_ids.extend(G[node][nbr].get("sourceRecordIds", []))

            patterns.append({
                "patternType": "HIGH_INFLUENCE_SUSPICIOUS_ACTOR",
                "severity": "HIGH",
                "entityId": node,
                "entityType": G.nodes[node].get("entityType", "UNKNOWN"),
                "entityValue": G.nodes[node].get("entityValue", ""),
                "description": f"Entity possesses elevated network influence (score: {inf}) combined with multiple anomalous behavioral patterns.",
                "evidence": f"Influence score: {inf} (Rank #{metric.get('rank', 'N/A')}), Degree Centrality: {metric.get('degreeCentrality')}",
                "score": round(inf, 2),
                "sourceRecordIds": list(set(rec_ids))
            })

    # Deduplicate patterns per entity & patternType
    unique_patterns = []
    seen = set()
    entity_pattern_scores = {}

    for p in patterns:
        key = (p.get("entityId"), p.get("patternType"))
        if key not in seen:
            seen.add(key)
            unique_patterns.append(p)

            ent_id = p.get("entityId")
            if ent_id:
                entity_pattern_scores[ent_id] = entity_pattern_scores.get(ent_id, 0.0) + p.get("score", 0.5)

    # Normalize entity pattern scores to 0..1
    for ent_id in entity_pattern_scores:
        entity_pattern_scores[ent_id] = round(min(1.0, entity_pattern_scores[ent_id] / 2.0), 4)

    # ── Enrich every pattern with evidenceReferences, metrics, whyDetected ──
    _why_templates = {
        "HIGH_CONNECTIVITY_HUB": lambda p, bl: (
            f"This entity has {p.get('evidence', '')} connections, "
            f"exceeding the network average of {bl.get('meanDegree', 'N/A')}. "
            f"High-degree nodes can act as coordinators or hubs of activity."
        ),
        "CROSS_COMMUNITY_BRIDGE": lambda p, bl: (
            f"{p.get('description', '')} "
            f"Bridge score: {p.get('score', 'N/A')}. "
            f"Cross-community connections may indicate coordination across separate groups."
        ),
        "HIGH_VOLUME_FINANCIAL_ACTIVITY": lambda p, bl: (
            f"{p.get('description', '')} "
            f"Baseline mean transaction: ₹{bl.get('meanTxAmount', 0):,.2f}. "
            f"This entity's volume significantly exceeds that baseline."
        ),
        "HIGH_VALUE_TRANSACTION": lambda p, bl: (
            f"{p.get('description', '')} "
            f"Baseline mean: ₹{bl.get('meanTxAmount', 0):,.2f}. "
            f"Single transactions substantially above the mean warrant further investigation."
        ),
        "REPEATED_COMMUNICATION": lambda p, bl: (
            f"{p.get('description', '')} "
            f"Total CDR records in dataset: {bl.get('totalCalls', 'N/A')}. "
            f"Repeated contact between the same pair of entities is a known indicator of coordination."
        ),
        "RAPID_TRANSACTION_CHAIN": lambda p, bl: (
            f"{p.get('description', '')} "
            f"Multi-hop fund movement across {bl.get('totalTransactions', 'N/A')} total transactions "
            f"in this case suggests potential layering activity."
        ),
        "HIGH_INFLUENCE_SUSPICIOUS_ACTOR": lambda p, bl: (
            f"{p.get('description', '')} "
            f"High-influence entities with multiple anomalous patterns require priority investigation attention."
        ),
    }

    for pat in unique_patterns:
        pat_type = pat.get("patternType", "")
        src_ids = pat.get("sourceRecordIds", [])

        # Resolve human-readable evidence IDs
        pat["evidenceReferences"] = _resolve_pattern_evidence(src_ids, raw_records)

        # Build metrics dict from actual values
        pat["metrics"] = {
            "severity": pat.get("severity"),
            "score": pat.get("score"),
            "evidence": pat.get("evidence", ""),
            "meanDegree": baselines.get("meanDegree"),
            "meanTxAmount": baselines.get("meanTxAmount"),
            "totalCalls": baselines.get("totalCalls"),
            "totalTransactions": baselines.get("totalTransactions"),
        }

        # Generate whyDetected from actual values
        template_fn = _why_templates.get(pat_type)
        if template_fn:
            try:
                pat["whyDetected"] = template_fn(pat, baselines)
            except Exception:
                pat["whyDetected"] = pat.get("description", "Pattern detected based on statistical analysis.")
        else:
            pat["whyDetected"] = pat.get("description", "Pattern detected based on statistical analysis.")

    return {
        "patterns": unique_patterns,
        "baselines": baselines,
        "entityPatternScores": entity_pattern_scores
    }
