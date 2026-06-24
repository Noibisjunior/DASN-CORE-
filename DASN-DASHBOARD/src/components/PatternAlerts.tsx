import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { AlertTriangle, MapPin, Package, Users, ShieldAlert } from 'lucide-react';

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

export default function PatternAlerts() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const response = await apiClient.get<GraphData>('/graph/view');
        setGraphData(response.data);
      } catch (error) {
        console.error("Error fetching pattern data:", error);
      }
    };
    
    fetchGraph();
    const interval = setInterval(fetchGraph, 5000);
    return () => clearInterval(interval);
  }, []);

  const getNodeIcon = (label: string) => {
    switch (label) {
      case 'Actor': return <Users size={16} color="#ef4444" />;
      case 'Logistics': return <Package size={16} color="#f59e0b" />;
      case 'Location': return <MapPin size={16} color="#3b82f6" />;
      case 'Report': return <ShieldAlert size={16} color="#6b7280" />;
      default: return <AlertTriangle size={16} color="#cccccc" />;
    }
  };

  const getNodeColor = (label: string) => {
    switch (label) {
      case 'Actor': return '#ef4444';
      case 'Logistics': return '#f59e0b';
      case 'Location': return '#3b82f6';
      case 'Report': return '#6b7280';
      default: return '#cccccc';
    }
  };

  if (graphData.links.length === 0) {
    return (
      <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', border: '2px solid #334155', borderRadius: '8px', color: '#64748b' }}>
        NO PATTERN ALERTS DETECTED
      </div>
    );
  }

  return (
    <div style={{ height: '400px', overflowY: 'auto', background: '#0f172a', border: '2px solid #334155', borderRadius: '8px', padding: '15px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {graphData.links.map((link, index) => {
          // Neo4j sometimes returns source/target as objects if the graph is hydrated, or as strings (IDs).
          // ForceGraph2D mutates the links array to turn string IDs into node object references!
          // But since we are just fetching the raw JSON here, they are string IDs.
          const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
          const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;
          
          const sourceNode = graphData.nodes.find(n => n.id === sourceId);
          const targetNode = graphData.nodes.find(n => n.id === targetId);

          if (!sourceNode || !targetNode) return null;

          return (
            <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(30, 41, 59, 0.8)', padding: '12px 15px', borderRadius: '6px', borderLeft: `3px solid ${getNodeColor(sourceNode.label)}` }}>
              
              {/* SOURCE NODE */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                {getNodeIcon(sourceNode.label)}
                <div>
                  <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>{sourceNode.label}</div>
                  <div style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '14px' }}>{sourceNode.name}</div>
                </div>
              </div>

              {/* RELATIONSHIP */}
              <div style={{ flex: 1, textAlign: 'center', padding: '0 10px' }}>
                <div style={{ display: 'inline-block', background: 'rgba(51, 65, 85, 0.5)', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', color: '#94a3b8', letterSpacing: '1px', fontWeight: 'bold' }}>
                  {link.name.replace(/_/g, ' ')}
                </div>
                <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #475569, transparent)', marginTop: '-8px', position: 'relative', zIndex: -1 }}></div>
              </div>

              {/* TARGET NODE */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end', textAlign: 'right' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>{targetNode.label}</div>
                  <div style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: '14px' }}>{targetNode.name}</div>
                </div>
                {getNodeIcon(targetNode.label)}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
