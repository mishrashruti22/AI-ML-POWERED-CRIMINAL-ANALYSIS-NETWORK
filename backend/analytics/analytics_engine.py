"""
ProbNexus AI/ML Criminal Network Analytics Engine (SIH26189)
Main orchestrator that executes the full graph analytics pipeline:
Graph Loader -> Centrality & Influence -> Louvain Communities & Bridges ->
Suspicious Activity & Baselines -> Risk Scoring -> Link Prediction -> Explainability.
"""

import sys
import json
import argparse
from typing import Dict, Any

from graph_loader import build_networkx_graph
from centrality import calculate_centrality
from community_detection import detect_communities_and_bridges
from suspicious_activity import detect_suspicious_patterns
from risk_scoring import calculate_risk_scores
from link_prediction import predict_hidden_links
from explainability import generate_explanations


def run_pipeline(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes all analytics stages sequentially on the case data payload.
    """
    case_id = payload.get("caseId", "UNKNOWN")
    case_number = payload.get("caseNumber", case_id)
    network_data = payload.get("network", {"nodes": [], "edges": []})
    raw_records = payload.get("rawRecords", {})

    # 1. Build NetworkX Graph
    G = build_networkx_graph(network_data)
    num_nodes = G.number_of_nodes()
    num_edges = G.number_of_edges()

    # 2. Centrality & Key Player Influence
    centrality_results = calculate_centrality(G)
    entity_metrics = centrality_results["entityMetrics"]
    key_players = centrality_results["keyPlayers"]

    # 3. Community Detection & Bridge Nodes (Louvain)
    community_results = detect_communities_and_bridges(G, entity_metrics)
    communities = community_results["communities"]
    bridge_entities = community_results["bridgeEntities"]

    # 4. Suspicious Pattern Detection & Statistical Baselines
    suspicious_results = detect_suspicious_patterns(G, entity_metrics, community_results, raw_records)
    patterns = suspicious_results["patterns"]
    baselines = suspicious_results["baselines"]

    # 5. Prioritization Risk Scoring (0-100)
    risk_results = calculate_risk_scores(G, entity_metrics, community_results, suspicious_results, raw_records)
    risk_entities = risk_results["riskEntities"]
    risk_summary = risk_results["riskSummary"]

    # 6. Hidden Link Prediction (Jaccard + Adamic-Adar)
    prediction_results = predict_hidden_links(G)
    predicted_links = prediction_results["predictedLinks"]

    # 7. Explainability & Evidence Traceability
    explanation_results = generate_explanations(
        G, entity_metrics, community_results, suspicious_results, risk_results, prediction_results, raw_records
    )
    explanations = explanation_results["explanations"]
    entity_explanations = explanation_results["entityExplanations"]

    # 8. Compile Comprehensive Per-Entity Intelligence Map
    entity_intelligence_map = {}
    for node in G.nodes():
        node_data = G.nodes[node]
        metric = entity_metrics.get(node, {})
        r_entry = next((r for r in risk_entities if r["entityId"] == node), {})
        comm_id = community_results["nodeCommunities"].get(node, 1)
        b_entry = next((b for b in bridge_entities if b["entityId"] == node), None)
        ent_patterns = [p for p in patterns if p.get("entityId") == node]
        ent_predictions = [p for p in predicted_links if p["entityAId"] == node or p["entityBId"] == node]
        ent_explanation = entity_explanations.get(node, {})

        # Connected entities (neighbors) with relationship types & evidence
        connected_relationships = []
        for nbr in G.neighbors(node):
            edge_attr = G[node][nbr]
            nbr_data = G.nodes[nbr]
            connected_relationships.append({
                "targetEntityId": nbr,
                "targetEntityType": nbr_data.get("entityType", "UNKNOWN"),
                "targetEntityValue": nbr_data.get("entityValue", ""),
                "relationshipType": edge_attr.get("relationshipType", "ASSOCIATED_WITH"),
                "weight": edge_attr.get("weight", 1.0),
                "sourceRecordIds": edge_attr.get("sourceRecordIds", [])
            })

        entity_intelligence_map[node] = {
            "entityId": node,
            "entityType": node_data.get("entityType", "UNKNOWN"),
            "entityValue": node_data.get("entityValue", ""),
            "normalizedValue": node_data.get("normalizedValue", ""),
            "degree": metric.get("degree", 0),
            "degreeCentrality": metric.get("degreeCentrality", 0.0),
            "betweennessCentrality": metric.get("betweennessCentrality", 0.0),
            "influenceScore": metric.get("influenceScore", 0.0),
            "rank": metric.get("rank", 1),
            "roleClassification": metric.get("roleClassification", "Active Participant"),
            "communityId": comm_id,
            "communityName": f"Community {comm_id}",
            "isBridge": b_entry is not None,
            "bridgeDetails": b_entry,
            "riskScore": r_entry.get("riskScore", 0.0),
            "riskLevel": r_entry.get("riskLevel", "LOW"),
            "riskBreakdown": r_entry.get("breakdown", {}),
            "suspiciousPatterns": ent_patterns,
            "predictedLinks": ent_predictions,
            "explanation": ent_explanation.get("explanationText", ""),
            "explanationFactors": ent_explanation.get("factors", []),
            "sourceRecordIds": ent_explanation.get("sourceRecordIds", []),
            "connectedRelationships": connected_relationships
        }

    return {
        "caseId": case_id,
        "caseNumber": case_number,
        "network": {
            "nodes": num_nodes,
            "relationships": len(network_data.get("edges", []))
        },
        "baselines": baselines,
        "keyPlayers": key_players,
        "communities": communities,
        "bridgeEntities": bridge_entities,
        "suspiciousPatterns": patterns,
        "riskEntities": risk_entities,
        "riskSummary": risk_summary,
        "predictedLinks": predicted_links,
        "explanations": explanations,
        "entityIntelligenceMap": entity_intelligence_map
    }


def main():
    parser = argparse.ArgumentParser(description="ProbNexus Graph Analytics Engine")
    parser.add_argument("--input", type=str, help="Path to input JSON file. If not specified, reads from stdin.")
    args = parser.parse_args()

    if args.input:
        with open(args.input, "r", encoding="utf-8") as f:
            payload = json.load(f)
    else:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            sys.stderr.write("Error: No input JSON received on stdin.\n")
            sys.exit(1)
        payload = json.loads(raw_input)

    result = run_pipeline(payload)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
