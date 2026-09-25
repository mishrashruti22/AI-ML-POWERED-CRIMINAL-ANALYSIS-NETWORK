"""
ProbNexus Centrality & Influence Module
Calculates Degree Centrality, Betweenness Centrality, Combined Influence Score,
and Ranks Key Network Players using NetworkX.
"""

import networkx as nx
from typing import Dict, Any, List


def calculate_centrality(
    G: nx.Graph,
    degree_weight: float = 0.45,
    betweenness_weight: float = 0.55
) -> Dict[str, Any]:
    """
    Computes degree centrality, betweenness centrality, and influence scores for all nodes.
    Returns per-node metrics and ranked key players.
    """
    num_nodes = G.number_of_nodes()
    
    if num_nodes == 0:
        return {"entityMetrics": {}, "keyPlayers": []}

    # If single node, centrality is 0.0
    if num_nodes == 1:
        single_node = list(G.nodes())[0]
        node_data = G.nodes[single_node]
        metric = {
            "entityId": single_node,
            "entityType": node_data.get("entityType", "UNKNOWN"),
            "entityValue": node_data.get("entityValue", ""),
            "normalizedValue": node_data.get("normalizedValue", ""),
            "degree": 0,
            "weightedDegree": 0.0,
            "degreeCentrality": 0.0,
            "betweennessCentrality": 0.0,
            "influenceScore": 0.0,
            "rank": 1,
            "roleClassification": "Isolated Entity"
        }
        return {
            "entityMetrics": {single_node: metric},
            "keyPlayers": [metric]
        }

    # Calculate Degree Centrality
    deg_centrality = nx.degree_centrality(G)
    raw_degrees = dict(G.degree())
    weighted_degrees = dict(G.degree(weight="weight"))

    # Calculate Betweenness Centrality
    try:
        bet_centrality = nx.betweenness_centrality(G, normalized=True)
    except Exception:
        bet_centrality = {node: 0.0 for node in G.nodes()}

    # Compute Influence Scores and Metrics
    metrics_list = []
    for node in G.nodes():
        node_data = G.nodes[node]
        deg_c = float(deg_centrality.get(node, 0.0))
        bet_c = float(bet_centrality.get(node, 0.0))
        
        # Transparent combined influence score formula
        influence = round(degree_weight * deg_c + betweenness_weight * bet_c, 4)
        
        # Neutral intelligence role classification
        if deg_c >= 0.5 and bet_c >= 0.5:
            role = "Core Hub & Bridge Coordinator"
        elif deg_c >= 0.4:
            role = "High-Connectivity Hub"
        elif bet_c >= 0.3:
            role = "Network Intermediary / Bridge"
        elif raw_degrees.get(node, 0) > 0:
            role = "Active Participant"
        else:
            role = "Peripheral / Isolated Entity"

        metric = {
            "entityId": node,
            "entityType": node_data.get("entityType", "UNKNOWN"),
            "entityValue": node_data.get("entityValue", ""),
            "normalizedValue": node_data.get("normalizedValue", ""),
            "degree": int(raw_degrees.get(node, 0)),
            "weightedDegree": round(float(weighted_degrees.get(node, 0.0)), 2),
            "degreeCentrality": round(deg_c, 4),
            "betweennessCentrality": round(bet_c, 4),
            "influenceScore": influence,
            "roleClassification": role
        }
        metrics_list.append(metric)

    # Sort descending by influence score (break ties by degree)
    metrics_list.sort(key=lambda x: (x["influenceScore"], x["degreeCentrality"], x["degree"]), reverse=True)

    # Assign ranks
    entity_metrics = {}
    for rank_idx, item in enumerate(metrics_list, start=1):
        item["rank"] = rank_idx
        entity_metrics[item["entityId"]] = item

    # Determine key players (top 3-5, adapted to graph size)
    top_k = min(5, max(1, len(metrics_list) // 2)) if len(metrics_list) > 3 else len(metrics_list)
    key_players = metrics_list[:top_k]

    return {
        "entityMetrics": entity_metrics,
        "keyPlayers": key_players,
        "formula": f"influence_score = {degree_weight} * degree_centrality + {betweenness_weight} * betweenness_centrality"
    }
