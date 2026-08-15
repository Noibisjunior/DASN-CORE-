import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { ShieldAlert, Database, Archive, ListTodo } from 'lucide-react';
import IntelligenceGraph from '../components/IntelligenceGraph';
import PatternAlerts from '../components/PatternAlerts';
import NotificationToast from '../components/NotificationToast';

interface ThreatPayload {
  anonymous_id?: string;
  threat_level?: string;
  timestamp?: string;
  message?: string; 
  raw_text?: string;
  media_url?: string;
  latitude?: number;
  longitude?: number;
  eth_tx_hash?: string;
  historical_score?: number;
  status?: string;
}

interface LedgerBlock {
  index: number;
  payload: ThreatPayload;
}

interface LedgerResponse {
  chain: LedgerBlock[];
  length: number;
  reputation_state: Record<string, number>; 
}

export default function CommandCenter() {
  const [ledger, setLedger] = useState<LedgerResponse | null>(null);
  const [serverStatus, setServerStatus] = useState<string>('Checking...');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authPin, setAuthPin] = useState('');
  const [feedTab, setFeedTab] = useState<'PENDING' | 'ARCHIVE' | 'LEDGER'>('PENDING');
  const [graphView, setGraphView] = useState<'RAW' | 'ALERTS'>('RAW');
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<{message: string, threatLevel: string} | null>(null);

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (authPin === '778899') {
      setIsAuthenticated(true);
      setAuthPin('');
    } else {
      alert("UNAUTHORIZED: Invalid Security Clearance");
    }
  };

  const executeSmartContract = async (anonymousId: string | undefined, isValid: boolean) => {
    if (!anonymousId) return;
    try {
      await apiClient.post('/ledger/validate', {
        anonymous_id: anonymousId,
        is_valid: isValid
      });
      fetchLedger();
    } catch (error) {
      console.error("Smart Contract Failed", error);
      alert("Failed to execute contract. Is Hardhat running?");
    }
  };

  const fetchLedger = async () => {
    try {
      const response = await apiClient.get<LedgerResponse>('/ledger/view');
      setLedger(response.data);
      setServerStatus('Online - Secure Connection');
    } catch (error) {
      console.error("Backend offline", error);
      setServerStatus('Offline - Check FastAPI');
    }
  };

  const fetchPatterns = async () => {
    try {
      const response = await apiClient.get('/graph/patterns');
      setAiInsights(response.data.patterns || []);
    } catch (error) {
      console.error("Patterns offline", error);
    }
  };

  useEffect(() => {
    fetchLedger();
    fetchPatterns();

    // Establish WebSocket Connection
    const wsUrl = import.meta.env.PROD 
      ? 'wss://dasn-core.onrender.com/ws/notifications'
      : 'ws://localhost:8000/ws/notifications';
    
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "NEW_REPORT") {
          // Immediately fetch newest data
          fetchLedger();
          fetchPatterns();

          // Show Toast
          setToastMessage({
            message: data.raw_text || "Incoming threat intelligence.",
            threatLevel: data.threat_level
          });

          // Trigger OS Desktop Notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(data.threat_level === "CRITICAL_THREAT" ? "CRITICAL THREAT" : "NEW INTELLIGENCE", {
              body: data.raw_text,
              icon: '/vite.svg' 
            });
          }
        } else if (data.event === "REPORT_VALIDATED") {
          // Instantly refresh ledger data to sync reputation score across all clients
          fetchLedger();
        }
      } catch (err) {
        console.error("WS Parse Error:", err);
      }
    };

    const interval = setInterval(() => {
      fetchLedger();
      fetchPatterns();
    }, 60000); // Gentle 60-second fallback

    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, []);

  return (
    <div className="command-center-container" style={{ padding: '20px', fontFamily: '"JetBrains Mono", "Roboto Mono", monospace', background: '#0f172a', color: '#e2e8f0', minHeight: '100vh' }}>
      {!isAuthenticated ? (
        <div style={{ maxWidth: '400px', margin: '100px auto', padding: '40px', background: 'rgba(30, 41, 59, 0.8)', border: '1px solid #334155', borderRadius: '12px', backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', textAlign: 'center' }}>
          <ShieldAlert size={56} color="#ef4444" style={{ margin: '0 auto 20px auto' }} />
          <h2 style={{ color: '#f8fafc', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '2px' }}>Restricted Access</h2>
          <p style={{ color: '#94a3b8', marginBottom: '30px', fontSize: '14px' }}>DASN Tactical Intelligence Grid</p>
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              value={authPin}
              onChange={(e) => setAuthPin(e.target.value)}
              placeholder="ENTER 6-DIGIT PIN"
              style={{ width: '100%', padding: '15px', marginBottom: '20px', borderRadius: '6px', border: '1px solid #475569', background: '#0f172a', color: '#10b981', textAlign: 'center', letterSpacing: '8px', fontSize: '20px', outline: 'none' }}
            />
            <button type="submit" style={{ width: '100%', padding: '15px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Authorize
            </button>
          </form>
        </div>
      ) : (
        <>
          <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '15px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <ShieldAlert color="#ef4444" size={36} />
              <h2 style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                Command Center C2 
                <span style={{fontSize: '12px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid #10b981', padding: '4px 10px', borderRadius: '4px', letterSpacing: '0'}}>AUTHORIZED</span>
              </h2>
            </div>
            <div style={{ textAlign: 'right', fontSize: '14px' }}>
              <p style={{ margin: 0, color: '#94a3b8' }}>Ethereum Node Status:</p>
              <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', color: serverStatus.includes('Online') ? '#10b981' : '#ef4444' }}>{serverStatus}</p>
            </div>
          </header>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '25px' }}>
            {/* Left Column: Live Threat Feed */}
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid #334155', padding: '20px', borderRadius: '12px', backdropFilter: 'blur(10px)' }}>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '15px' }}>
                <button 
                  onClick={() => setFeedTab('PENDING')} 
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: feedTab === 'PENDING' ? '#ef4444' : 'transparent', color: feedTab === 'PENDING' ? 'white' : '#94a3b8', border: feedTab === 'PENDING' ? '1px solid #ef4444' : '1px solid #475569', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: 1, justifyItems: 'center', justifyContent: 'center' }}>
                  <ListTodo size={18} /> Action Queue
                </button>
                <button 
                  onClick={() => setFeedTab('ARCHIVE')} 
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: feedTab === 'ARCHIVE' ? '#334155' : 'transparent', color: feedTab === 'ARCHIVE' ? 'white' : '#94a3b8', border: feedTab === 'ARCHIVE' ? '1px solid #475569' : '1px solid #475569', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: 1, justifyItems: 'center', justifyContent: 'center' }}>
                  <Archive size={18} /> Archive
                </button>
                <button 
                  onClick={() => setFeedTab('LEDGER')} 
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: feedTab === 'LEDGER' ? 'rgba(16, 185, 129, 0.2)' : 'transparent', color: feedTab === 'LEDGER' ? '#10b981' : '#94a3b8', border: feedTab === 'LEDGER' ? '1px solid #10b981' : '1px solid #475569', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', flex: 1, justifyItems: 'center', justifyContent: 'center' }}>
                  <Database size={18} /> Immutable Ledger
                </button>
              </div>

              <div style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', paddingRight: '5px' }}>
                {ledger ? (
                  feedTab === 'LEDGER' ? (
                    <div style={{ paddingLeft: '20px', borderLeft: '2px solid #334155', marginLeft: '10px', marginTop: '10px' }}>
                      {ledger.chain.filter(b => b.index > 1).map((block) => (
                        <div key={block.index} style={{ position: 'relative', background: 'rgba(15, 23, 42, 0.6)', padding: '20px', marginBottom: '30px', borderRadius: '8px', border: '1px solid #334155' }}>
                          {/* Circle for timeline */}
                          <div style={{ position: 'absolute', left: '-31px', top: '20px', width: '20px', height: '20px', borderRadius: '50%', background: '#0f172a', border: '4px solid #10b981' }}></div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #334155', paddingBottom: '10px', marginBottom: '15px' }}>
                            <strong style={{fontSize: '14px', color: '#f8fafc', letterSpacing: '1px'}}>BLOCK #{block.index}</strong>
                            <span style={{ color: '#94a3b8', fontSize: '12px', fontFamily: 'monospace' }}>
                              {block.payload.timestamp ? new Date(block.payload.timestamp).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                          
                          <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>
                            <div style={{ marginBottom: '8px' }}>
                              <span style={{ color: '#cbd5e1' }}>AUTHOR:</span> {block.payload.anonymous_id}
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                              <span style={{ color: '#cbd5e1' }}>THREAT:</span> <span style={{ color: block.payload.threat_level === 'CRITICAL_THREAT' ? '#ef4444' : '#10b981' }}>{block.payload.threat_level}</span>
                            </div>
                            <div style={{ background: '#0f172a', padding: '10px', borderRadius: '4px', border: '1px solid #1e293b', wordBreak: 'break-all', marginTop: '15px' }}>
                              <span style={{ color: '#3b82f6', display: 'block', marginBottom: '5px' }}>ETHEREUM TX HASH:</span>
                              <span style={{ color: '#e2e8f0' }}>{block.payload.eth_tx_hash || 'PENDING NETWORK CONFIRMATION'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    ledger.chain
                      .filter(block => block.index > 1)
                      .filter(block => feedTab === 'PENDING' ? (block.payload.status === 'PENDING' || !block.payload.status) : (block.payload.status === 'VERIFIED' || block.payload.status === 'DECOY'))
                      .reverse()
                      .map((block) => (
                      <div key={block.index} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '20px', marginBottom: '15px', borderLeft: block.payload.threat_level === 'CRITICAL_THREAT' ? '4px solid #ef4444' : '4px solid #64748b', borderRadius: '8px', border: '1px solid #334155', borderLeftWidth: '4px' }}>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '10px', marginBottom: '15px' }}>
                        <strong style={{fontSize: '13px', color: '#94a3b8', fontFamily: 'monospace'}}>ID: {block.payload.anonymous_id?.substring(0, 12)}...</strong>
                        <span style={{ color: block.payload.threat_level === 'CRITICAL_THREAT' ? '#ef4444' : '#cbd5e1', fontWeight: 'bold', fontSize: '13px', letterSpacing: '1px' }}>{block.payload.threat_level}</span>
                      </div>

                      <p style={{ fontStyle: 'italic', color: '#f8fafc', margin: '0 0 15px 0', fontSize: '15px', lineHeight: '1.5' }}>"{block.payload.raw_text}"</p>

                      {block.payload.media_url && (
                        <div style={{ marginTop: '15px', marginBottom: '15px' }}>
                          <img src={block.payload.media_url} alt="Evidence" style={{ width: '100%', maxHeight: '250px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #475569' }} />
                        </div>
                      )}

                      {block.payload.latitude && block.payload.longitude && (
                        <div style={{ marginTop: '10px', marginBottom: '15px', fontSize: '13px' }}>
                          <a href={`https://www.google.com/maps?q=${block.payload.latitude},${block.payload.longitude}`} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(59, 130, 246, 0.1)', padding: '5px 10px', borderRadius: '4px' }}>
                            ⌖ TACTICAL MAP VIEW
                          </a>
                        </div>
                      )}

                      <div style={{ marginTop: '15px', borderTop: '1px dashed #475569', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        
                        <div style={{ fontSize: '13px', color: '#e2e8f0', display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>Reporter History</span>
                          <span>Trust Score: <span style={{ color: (block.payload.historical_score !== undefined ? block.payload.historical_score : (ledger.reputation_state[block.payload.anonymous_id as string] || 0)) >= 0 ? '#10b981' : '#ef4444', fontWeight: 'bold', fontSize: '16px', marginLeft: '5px' }}>
                            {block.payload.historical_score !== undefined ? block.payload.historical_score : (ledger.reputation_state[block.payload.anonymous_id as string] || 0)}
                          </span></span>
                        </div>

                        {feedTab === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                              onClick={() => executeSmartContract(block.payload.anonymous_id, true)}
                              style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid #10b981', padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>
                              Verify
                            </button>
                            <button 
                              onClick={() => executeSmartContract(block.payload.anonymous_id, false)}
                              style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid #ef4444', padding: '6px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>
                              Decoy
                            </button>
                          </div>
                        ) : (
                          <div style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '1px', color: block.payload.status === 'VERIFIED' ? '#10b981' : '#ef4444', background: block.payload.status === 'VERIFIED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding: '5px 10px', borderRadius: '4px', border: block.payload.status === 'VERIFIED' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)' }}>
                            {block.payload.status}
                          </div>
                        )}

                      </div>

                      <div style={{ marginTop: '12px', fontSize: '11px', color: '#64748b', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                        TX: {block.payload.eth_tx_hash}
                      </div>

                    </div>
                  ))
                )) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <div style={{ animation: 'pulse 2s infinite' }}>SYNCING WITH LEDGER...</div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Visual Graph Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* AI INSIGHTS BANNER */}
              {aiInsights.length > 0 && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '15px 20px', borderRadius: '8px', borderLeftWidth: '4px' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    <ShieldAlert size={18} /> CRITICAL AI INSIGHTS DETECTED
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {aiInsights.map((insight, idx) => (
                      <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '10px', borderRadius: '4px', border: '1px solid #334155', fontSize: '13px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', background: insight.severity === 'CRITICAL' ? '#ef4444' : insight.severity === 'HIGH' ? '#f59e0b' : '#3b82f6', color: 'white' }}>
                          {insight.type.replace(/_/g, ' ')}
                        </span>
                        <span>{insight.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ background: 'rgba(30, 41, 59, 0.5)', border: '1px solid #334155', padding: '20px', borderRadius: '12px', backdropFilter: 'blur(10px)', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '15px' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '16px' }}>
                    <Database size={20} color="#3b82f6" /> Intelligence Topology
                </h3>
                <div style={{ display: 'flex', background: '#0f172a', borderRadius: '6px', border: '1px solid #334155', overflow: 'hidden' }}>
                  <button 
                    onClick={() => setGraphView('RAW')}
                    style={{ background: graphView === 'RAW' ? '#3b82f6' : 'transparent', color: graphView === 'RAW' ? 'white' : '#64748b', border: 'none', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                    RAW GRAPH
                  </button>
                  <button 
                    onClick={() => setGraphView('ALERTS')}
                    style={{ background: graphView === 'ALERTS' ? '#10b981' : 'transparent', color: graphView === 'ALERTS' ? 'white' : '#64748b', border: 'none', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                    PATTERN ALERTS
                  </button>
                </div>
              </div>
              <div style={{ marginTop: '20px' }}>
                {graphView === 'RAW' ? (
                  <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #475569' }}>
                    <IntelligenceGraph />
                  </div>
                ) : (
                  <PatternAlerts />
                )}
              </div>
              </div>
            </div>
          </div>
        </>
      )}

      {toastMessage && (
        <NotificationToast 
          message={toastMessage.message} 
          threatLevel={toastMessage.threatLevel} 
          onClose={() => setToastMessage(null)} 
        />
      )}
    </div>
  );
}
