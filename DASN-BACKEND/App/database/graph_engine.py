from neo4j import GraphDatabase

class DASNGraphDB:
    def __init__(self, uri, user, password):
        # Establish connection to Neo4j Aura
        self.driver = GraphDatabase.driver(
            uri,
            auth=(user, password),
            connection_timeout=5,
            max_transaction_retry_time=5,
        )

    def close(self):
        self.driver.close()

    def map_intelligence(self, anonymous_id, extracted_data):
        """
        Takes the structured AI output and draws it on the graph database.
        """
        with self.driver.session() as session:
            # We use 'tx' (transactions) to ensure everything writes perfectly
            session.execute_write(self._create_threat_graph, anonymous_id, extracted_data)

    @staticmethod
    def _create_threat_graph(tx, anonymous_id, data):
        # 1. Create the Intelligence Report Node (The anchor)
        tx.run(
            "MERGE (r:Report {id: $report_id})",
            report_id=anonymous_id
        )

        actors = data.get("actors", [])
        locations = data.get("locations", [])
        resources = data.get("resources", [])

        # 2. Map Actors (Who)
        for actor in actors:
            tx.run(
                "MERGE (a:Actor {name: $name}) "
                "MERGE (r:Report {id: $report_id}) "
                "MERGE (r)-[:IDENTIFIED]->(a)",
                name=actor.upper(), report_id=anonymous_id
            )

        # 3. Map Locations (Where)
        for location in locations:
            tx.run(
                "MERGE (l:Location {name: $name}) "
                "MERGE (r:Report {id: $report_id}) "
                "MERGE (r)-[:OCCURRED_AT]->(l)",
                name=location.title(), report_id=anonymous_id
            )
            # Link Actors directly to Locations if both exist
            for actor in actors:
                tx.run(
                    "MATCH (a:Actor {name: $actor_name}), (l:Location {name: $loc_name}) "
                    "MERGE (a)-[:OPERATES_NEAR]->(l)",
                    actor_name=actor.upper(), loc_name=location.title()
                )

        # 4. Map Logistical Resources (What)
        for resource in resources:
            tx.run(
                "MERGE (res:Logistics {name: $name}) "
                "MERGE (r:Report {id: $report_id}) "
                "MERGE (r)-[:INVOLVES_RESOURCE]->(res)",
                name=resource.lower(), report_id=anonymous_id
            )
            # Link Actors directly to the Resources they are buying/moving
            for actor in actors:
                tx.run(
                    "MATCH (a:Actor {name: $actor_name}), (res:Logistics {name: $res_name}) "
                    "MERGE (a)-[:PROCURED]->(res)",
                    actor_name=actor.upper(), res_name=resource.lower()
                )

    def get_graph_data(self):
        """Fetches the graph data in a React-friendly format."""
        with self.driver.session() as session:
            # Query extracts IDs, Labels, Names, and Relationships directly
            query = """
            MATCH (n)-[r]->(m)
            RETURN id(n) AS source_id, labels(n)[0] AS source_label, coalesce(n.name, n.id) AS source_name,
                   id(m) AS target_id, labels(m)[0] AS target_label, coalesce(m.name, m.id) AS target_name,
                   type(r) AS rel_type
            """
            result = session.run(query)

            nodes_dict = {}
            links = []

            for record in result:
                s_id = str(record["source_id"])
                t_id = str(record["target_id"])

                # Deduplicate nodes
                if s_id not in nodes_dict:
                    nodes_dict[s_id] = {"id": s_id, "label": record["source_label"], "name": record["source_name"]}
                if t_id not in nodes_dict:
                    nodes_dict[t_id] = {"id": t_id, "label": record["target_label"], "name": record["target_name"]}

                links.append({"source": s_id, "target": t_id, "name": record["rel_type"]})

            return {"nodes": list(nodes_dict.values()), "links": links}

    def discover_threat_patterns(self):
        """Runs AI-like advanced Cypher queries to discover complex insights."""
        insights = []
        with self.driver.session() as session:
            # 1. Syndicate Detection
            syndicate_query = """
            MATCH (a1:Actor)-[:OPERATES_NEAR]->(l:Location)<-[:OPERATES_NEAR]-(a2:Actor)
            WHERE id(a1) < id(a2)
            RETURN a1.name AS actor1, a2.name AS actor2, l.name AS location
            """
            try:
                for record in session.run(syndicate_query):
                    insights.append({
                        "type": "SYNDICATE_DETECTED",
                        "severity": "CRITICAL",
                        "message": f"Syndicate detected: {record['actor1']} and {record['actor2']} are both operating near {record['location']}."
                    })
            except Exception as e:
                print(f"Syndicate query error: {e}")

            # 2. Resource Hoarding
            hoarding_query = """
            MATCH (a:Actor)-[:PROCURED]->(res:Logistics)
            WITH a, collect(DISTINCT res.name) as resources, count(DISTINCT res) as count
            WHERE count >= 2
            RETURN a.name AS actor, resources
            """
            try:
                for record in session.run(hoarding_query):
                    res_list = ", ".join(record['resources'])
                    insights.append({
                        "type": "RESOURCE_HOARDING",
                        "severity": "HIGH",
                        "message": f"Hoarding detected: {record['actor']} has procured multiple distinct resources ({res_list})."
                    })
            except Exception as e:
                print(f"Hoarding query error: {e}")

            # 3. High-Risk Hotspots
            hotspot_query = """
            MATCH (r:Report)-[:OCCURRED_AT]->(l:Location)
            WITH l, count(DISTINCT r) as report_count
            WHERE report_count >= 2
            RETURN l.name AS location, report_count
            """
            try:
                for record in session.run(hotspot_query):
                    insights.append({
                        "type": "HOTSPOT_IDENTIFIED",
                        "severity": "ELEVATED",
                        "message": f"Hotspot identified: {record['location']} is the subject of {record['report_count']} distinct intelligence reports."
                    })
            except Exception as e:
                print(f"Hotspot query error: {e}")

        return insights