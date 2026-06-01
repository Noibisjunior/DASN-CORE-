import { useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { apiClient } from '../api/client';

interface GraphNode {
  id: string;
  label: string;
  name: string;
}

interface GraphLink {
  source: string;
  target: string;
  name: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export default function IntelligenceGraph() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const response = await apiClient.get<GraphData>('/graph/view');
        setGraphData(response.data);
      } catch (error) {
        console.error("Error fetching graph data:", error);
      }
    };
    
    fetchGraph();
    // Auto-refresh the graph every 5 seconds to catch live threats!
    const interval = setInterval(fetchGraph, 5000);
    return () => clearInterval(interval);
  }, []);

  // Tactical Color Coding based on the Node's Label
  const getNodeColor = (node: any) => {
    switch (node.label) {
      case 'Actor': return '#ef4444';     // Red for Armed Groups
      case 'Logistics': return '#f59e0b'; // Orange for Resources
      case 'Location': return '#3b82f6';  // Blue for Geography
      case 'Report': return '#6b7280';    // Gray for Hash Anchors
      default: return '#cccccc';
    }
  };

  return (
    <div style={{ width: '100%', height: '400px', backgroundColor: '#111827', borderRadius: '8px', overflow: 'hidden', border: '2px solid #374151' }}>
      <ForceGraph2D
        graphData={graphData}
        nodeLabel="name"
        nodeColor={getNodeColor}
        nodeRelSize={7}
        linkColor={() => '#4b5563'}
        linkDirectionalArrowLength={4}
        linkDirectionalArrowRelPos={1}
        width={700}
        height={400}
      />
    </div>
  );
}