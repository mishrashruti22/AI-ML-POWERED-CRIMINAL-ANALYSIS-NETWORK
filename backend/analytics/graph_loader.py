"""
ProbNexus Graph Loader
Constructs NetworkX graphs from normalized entity & relationship data.
Preserves entity types, values, edge weights, and source evidence record IDs.
"""

import networkx as nx
from typing import Dict, Any, List, Optional


def build_networkx_graph(network_data: Dict[str, Any]) -> nx.Graph:
    """
    Build an undirected NetworkX Graph from JSON network payload.
    Safely handles empty datasets and disconnected nodes.
    """
    G = nx.Graph()
    
    nodes = network_data.get("nodes", [])
    edges = network_data.get("edges", [])

    # Add all entities as nodes
    for node in nodes:
        node_id = str(node.get("id"))
        G.add_node(
            node_id,
            id=node_id,
            entityType=node.get("entityType", "UNKNOWN"),
            entityValue=node.get("entityValue", ""),
            normalizedValue=node.get("normalizedValue", node.get("entityValue", ""))
        )

    # Add all relationships as edges (aggregating weights/evidence if multiple exist)
    for edge in edges:
        source_id = str(edge.get("source") or edge.get("entityAId"))
        target_id = str(edge.get("target") or edge.get("entityBId"))
        
        if not source_id or not target_id or source_id == target_id:
            continue

        # Ensure source and target nodes exist in graph
        if not G.has_node(source_id):
            G.add_node(source_id, id=source_id, entityType="UNKNOWN", entityValue=source_id, normalizedValue=source_id)
        if not G.has_node(target_id):
            G.add_node(target_id, id=target_id, entityType="UNKNOWN", entityValue=target_id, normalizedValue=target_id)

        rel_type = edge.get("relationshipType", "ASSOCIATED_WITH")
        weight = float(edge.get("weight", 1.0) or 1.0)
        conf = float(edge.get("confidenceScore", 1.0) or 1.0)
        source_record_id = edge.get("sourceRecordId")

        if G.has_edge(source_id, target_id):
            # Update existing edge
            existing_data = G[source_id][target_id]
            existing_data["weight"] += weight
            if source_record_id and source_record_id not in existing_data.get("sourceRecordIds", []):
                existing_data["sourceRecordIds"].append(source_record_id)
            if rel_type not in existing_data.get("relationshipTypes", []):
                existing_data["relationshipTypes"].append(rel_type)
        else:
            source_record_ids = [source_record_id] if source_record_id else []
            G.add_edge(
                source_id,
                target_id,
                weight=weight,
                confidenceScore=conf,
                relationshipType=rel_type,
                relationshipTypes=[rel_type],
                sourceRecordId=source_record_id,
                sourceRecordIds=source_record_ids
            )

    return G
