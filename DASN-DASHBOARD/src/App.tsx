import { useState, useEffect } from 'react'
import { apiClient } from './api/client'
import { ShieldAlert, Activity, Database } from 'lucide-react'
import './App.css'
import IntelligenceGraph from './components/IntelligenceGraph'

// --- TYPESCRIPT INTERFACES ---

interface ThreatPayload {
  anonymous_id?: string;
  threat_level?: string;
  timestamp?: string;
  message?: string; // For the Genesis block
}

interface LedgerBlock {
  index: number;
  timestamp: number;
  payload: ThreatPayload;
  proof: number;
  previous_hash: string;
}

interface LedgerResponse {
  chain: LedgerBlock[];
  length: number;
}
// -----------------------------

function App() {
  // Notice the <LedgerResponse | null> type definition!
  const [ledger, setLedger] = useState<LedgerResponse | null>(null)
  const [serverStatus, setServerStatus] = useState<string>('Checking...')

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        // We strictly type the expected axios response
        const response = await apiClient.get<LedgerResponse>('/ledger/view')
        setLedger(response.data)
        setServerStatus('Online - Secure Connection')
      } catch (error) {
        console.error("Backend offline", error)
        setServerStatus('Offline - Check FastAPI')
      }
    }
    fetchLedger()
  }, [])

  return (
    <div className="dashboard-container" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      
      {/* Header Bar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldAlert color="red" size={32} />
          <h1>DASN Command Center</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p><strong>System Status:</strong> <span style={{ color: serverStatus.includes('Online') ? 'green' : 'red' }}>{serverStatus}</span></p>
        </div>
      </header>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginTop: '20px' }}>
        
        {/* Left Column: Live Threat Feed */}
        <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={24} /> Live Threat Feed
          </h2>
          <div style={{ marginTop: '15px' }}>
            {ledger ? (
              ledger.chain.filter(block => block.index > 1).map((block) => (
                <div key={block.index} style={{ background: 'white', padding: '10px', marginBottom: '10px', borderLeft: '4px solid red', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <strong>Hash:</strong> {block.payload.anonymous_id?.substring(0, 8)}...<br/>
                  <strong>Assessment:</strong> {block.payload.threat_level}<br/>
                  <small style={{ color: '#666' }}>
                    {block.payload.timestamp ? new Date(block.payload.timestamp).toLocaleString() : 'Unknown Time'}
                  </small>
                </div>
              ))
            ) : (
              <p>Loading encrypted intelligence...</p>
            )}
          </div>
        </div>

        {/* Right Column: Visual Graph Area */}
        <div style={{ background: '#e9ecef', padding: '15px', borderRadius: '8px', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
           <Database size={48} color="#6c757d" />
           <h2 style={{ color: '#495057', marginTop: '10px' }}>Intelligence Logistics Graph</h2>
           <IntelligenceGraph />
        </div>

      </div>
    </div>
  )
}

export default App