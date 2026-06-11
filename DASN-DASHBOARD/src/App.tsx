import { useState, useEffect } from 'react'
import { apiClient } from './api/client'
import { ShieldAlert, Database, Users, Archive, ListTodo } from 'lucide-react'
import IntelligenceGraph from './components/IntelligenceGraph'
import ReporterForm from './components/ReporterForm' 
import './App.css'

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
  historical_score?: number; // NEW: The accumulated score from Ethereum
  status?: string;           // NEW: PENDING, VERIFIED, or DECOY
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

function App() {
  const [ledger, setLedger] = useState<LedgerResponse | null>(null)
  const [serverStatus, setServerStatus] = useState<string>('Checking...')
  
  const [activeView, setActiveView] = useState<'REPORTER' | 'COMMAND'>('REPORTER')

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authPin, setAuthPin] = useState('');

  // NEW: State to toggle between Pending actions and the Archive
  const [feedTab, setFeedTab] = useState<'PENDING' | 'ARCHIVE'>('PENDING');

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
      fetchLedger(); // Refresh to move the item to the Archive and update the score
    } catch (error) {
      console.error("Smart Contract Failed", error);
      alert("Failed to execute contract. Is Hardhat running?");
    }
  };

  const fetchLedger = async () => {
    try {
      const response = await apiClient.get<LedgerResponse>('/ledger/view')
      setLedger(response.data)
      setServerStatus('Online - Secure Connection')
    } catch (error) {
      console.error("Backend offline", error)
      setServerStatus('Offline - Check FastAPI')
    }
  }

  useEffect(() => {
    fetchLedger()
    const interval = setInterval(() => {
        if(activeView === 'COMMAND') fetchLedger()
    }, 5000);
    return () => clearInterval(interval);
  }, [activeView])

  return (
    <div className="dashboard-container" style={{ padding: '20px', fontFamily: 'sans-serif', background: '#f3f4f6', minHeight: '100vh' }}>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '30px' }}>
        <button 
          onClick={() => setActiveView('REPORTER')}
          style={{ padding: '10px 20px', background: activeView === 'REPORTER' ? '#10b981' : '#e5e7eb', color: activeView === 'REPORTER' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
          <Users size={18} /> Citizen Web Portal
        </button>
        <button 
          onClick={() => setActiveView('COMMAND')}
          style={{ padding: '10px 20px', background: activeView === 'COMMAND' ? '#1f2937' : '#e5e7eb', color: activeView === 'COMMAND' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
          <ShieldAlert size={18} /> Police Command Center
        </button>
      </div>

      {activeView === 'REPORTER' && (
        <div style={{ paddingTop: '20px' }}>
          <ReporterForm />
        </div>
      )}

      {activeView === 'COMMAND' && (
        <>
          {!isAuthenticated ? (
            <div style={{ maxWidth: '400px', margin: '50px auto', padding: '30px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'center' }}>
              <ShieldAlert size={48} color="#ef4444" style={{ margin: '0 auto 15px auto' }} />
              <h2 style={{ color: '#1f2937', marginBottom: '5px' }}>Restricted Access</h2>
              <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px' }}>Enter Commander PIN to access the DASN Intelligence Grid.</p>
              <form onSubmit={handleLogin}>
                <input 
                  type="password" 
                  value={authPin}
                  onChange={(e) => setAuthPin(e.target.value)}
                  placeholder="Enter 6-Digit PIN"
                  style={{ width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'center', letterSpacing: '4px', fontSize: '18px' }}
                />
                <button type="submit" style={{ width: '100%', padding: '12px', background: '#1f2937', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Authorize
                </button>
              </form>
            </div>
          ) : (
            <>
              <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldAlert color="red" size={32} />
                  <h2>Command Center C2 <span style={{fontSize: '12px', background: '#10b981', color: 'white', padding: '3px 8px', borderRadius: '12px', verticalAlign: 'middle'}}>Authorized</span></h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p><strong>Ethereum Node:</strong> <span style={{ color: serverStatus.includes('Online') ? 'green' : 'red' }}>{serverStatus}</span></p>
                </div>
              </header>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginTop: '20px' }}>
                {/* Left Column: Live Threat Feed */}
                <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  
                  {/* NEW: Toggle Buttons for Action Queue vs Archive */}
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px' }}>
                    <button 
                      onClick={() => setFeedTab('PENDING')} 
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', background: feedTab === 'PENDING' ? '#ef4444' : '#e5e7eb', color: feedTab === 'PENDING' ? 'white' : 'black', padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', flex: 1, justifyContent: 'center' }}>
                      <ListTodo size={16} /> Action Queue
                    </button>
                    <button 
                      onClick={() => setFeedTab('ARCHIVE')} 
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', background: feedTab === 'ARCHIVE' ? '#4b5563' : '#e5e7eb', color: feedTab === 'ARCHIVE' ? 'white' : 'black', padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', flex: 1, justifyContent: 'center' }}>
                      <Archive size={16} /> Archive
                    </button>
                  </div>

                  <div style={{ marginTop: '15px', maxHeight: '600px', overflowY: 'auto' }}>
                    {ledger ? (
                      ledger.chain
                        .filter(block => block.index > 1)
                        // NEW: Filter logic to split Pending and Archived reports
                        .filter(block => feedTab === 'PENDING' ? (block.payload.status === 'PENDING' || !block.payload.status) : (block.payload.status === 'VERIFIED' || block.payload.status === 'DECOY'))
                        .reverse()
                        .map((block) => (
                        <div key={block.index} style={{ background: '#f8f9fa', padding: '15px', marginBottom: '15px', borderLeft: block.payload.threat_level === 'CRITICAL_THREAT' ? '5px solid red' : '5px solid gray', borderRadius: '6px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', paddingBottom: '8px', marginBottom: '8px' }}>
                            <strong style={{fontSize: '12px', color: '#666'}}>ID: {block.payload.anonymous_id?.substring(0, 8)}...</strong>
                            <span style={{ color: block.payload.threat_level === 'CRITICAL_THREAT' ? 'red' : 'gray', fontWeight: 'bold', fontSize: '14px' }}>{block.payload.threat_level}</span>
                          </div>

                          <p style={{ fontStyle: 'italic', color: '#333', margin: '10px 0' }}>"{block.payload.raw_text}"</p>

                          {block.payload.media_url && (
                            <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                              <img src={block.payload.media_url} alt="Evidence" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ccc' }} />
                            </div>
                          )}

                          {block.payload.latitude && block.payload.longitude && (
                            <div style={{ marginTop: '10px', fontSize: '13px' }}>
                              <a href={`https://www.google.com/maps?q=${block.payload.latitude},${block.payload.longitude}`} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 'bold' }}>
                                View on Map
                              </a>
                            </div>
                          )}

                          {/* SMART CONTRACT REPUTATION UI */}
                          <div style={{ marginTop: '15px', borderTop: '1px dashed #ccc', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#1f2937', display: 'flex', flexDirection: 'column' }}>
                              {/* Show historical context directly to the Commander! */}
                              <span style={{ color: '#6b7280', fontSize: '10px' }}>Reporter History:</span>
                              <span>Trust Score: <span style={{ color: (block.payload.historical_score || ledger.reputation_state[block.payload.anonymous_id as string] || 0) >= 0 ? 'green' : 'red', fontSize: '14px' }}>
                                {block.payload.historical_score !== undefined ? block.payload.historical_score : (ledger.reputation_state[block.payload.anonymous_id as string] || 0)}
                              </span></span>
                            </div>

                            {/* Only show the Action buttons if it is in the PENDING tab! */}
                            {feedTab === 'PENDING' ? (
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <button 
                                  onClick={() => executeSmartContract(block.payload.anonymous_id, true)}
                                  style={{ background: '#10b981', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                                  Verify
                                </button>
                                <button 
                                  onClick={() => executeSmartContract(block.payload.anonymous_id, false)}
                                  style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                                  Decoy
                                </button>
                              </div>
                            ) : (
                              <div style={{ fontSize: '12px', fontWeight: 'bold', color: block.payload.status === 'VERIFIED' ? '#10b981' : '#ef4444' }}>
                                {block.payload.status}
                              </div>
                            )}

                          </div>

                          {/* Ethereum Tx Hash Display */}
                          <div style={{ marginTop: '8px', fontSize: '10px', color: '#9ca3af', wordBreak: 'break-all' }}>
                            Tx: {block.payload.eth_tx_hash}
                          </div>

                        </div>
                      ))
                    ) : (
                      <p>Loading...</p>
                    )}
                  </div>
                </div>

                {/* Right Column: Visual Graph Area */}
                <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Database size={20} /> Intelligence Logistics Graph
                  </h3>
                  <IntelligenceGraph />
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default App