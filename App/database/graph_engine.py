from neo4j import GraphDatabase

class DASNGraphDB:
    def __init__(self, uri, user, password):
        # Establish connection to  Neo4j Desktop
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

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