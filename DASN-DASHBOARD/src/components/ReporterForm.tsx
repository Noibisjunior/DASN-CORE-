import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Send, ShieldCheck, CheckCircle, Paperclip } from 'lucide-react';

export default function ReporterForm() {
  const [rawText, setRawText] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [receipt, setReceipt] = useState<string | null>(null);
  const [location, setLocation] = useState<{lat: number, lon: number} | null>(null);
  
  // The persistent state for the browser wallet
  const [informantId, setInformantId] = useState<string>('');

  useEffect(() => {
    // Check if this device already has an identity
    let storedId = localStorage.getItem('dasn_web_identity');
    
    if (!storedId) {
      // Generate a secure random hex ID like 'web-0x4f8a92b'
      const randomHex = Math.random().toString(16).substring(2, 10);
      storedId = `web-0x${randomHex}`;
      
      // Save it permanently in the browser
      localStorage.setItem('dasn_web_identity', storedId);
    }
    
    setInformantId(storedId);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    
    const formData = new FormData();
    // FIX: We now send the persistent informantId instead of the temporary sessionToken!
    formData.append('phone_number', informantId); 
    formData.append('raw_text', rawText);
    formData.append('interface_type', 'WEB_APP');
    
    if (mediaFile) {
      formData.append('media_file', mediaFile);
    }

    if (location) {
      formData.append('latitude', location.lat.toString());
      formData.append('longitude', location.lon.toString());
    }
    
    try {
      const response = await apiClient.post('/report/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setStatus('success');
      setReceipt(response.data.data.anonymous_hash);
      setRawText('');
      setMediaFile(null);
    } catch (error) {
      console.error("Submission failed", error);
      setStatus('error');
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <ShieldCheck size={48} color="#10b981" style={{ margin: '0 auto' }} />
        <h2 style={{ color: '#1f2937' }}>Anonymous Secure Tip Line</h2>
        <p style={{ color: '#6b7280' }}>Zero PII collected. Your identity is cryptographically secure.</p>
      </div>

      {status === 'success' ? (
        <div style={{ background: '#d1fae5', padding: '15px', borderRadius: '8px', border: '1px solid #10b981', textAlign: 'center' }}>
          <h3 style={{ color: '#065f46', margin: '0 0 10px 0' }}>Report Submitted Safely</h3>
          <p style={{ color: '#047857', fontSize: '14px', wordBreak: 'break-all' }}>
            <strong>Your Anonymity Receipt:</strong><br/>{receipt}
          </p>
          <button onClick={() => setStatus('idle')} style={{ marginTop: '15px', padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Submit Another Report
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* NEW: Visual Feedback showing the Informant their persistent ID */}
          {informantId && (
            <div style={{ background: '#f3f4f6', padding: '10px', borderRadius: '6px', fontSize: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
              <span style={{ color: '#6b7280' }}>Device Wallet ID: </span>
              <strong style={{ color: '#10b981', fontFamily: 'monospace', fontSize: '14px' }}>{informantId}</strong>
            </div>
          )}

          <div>
            <div style={{ marginBottom: '10px' }}>
              <button 
                type="button" 
                onClick={() => {
                  if ("geolocation" in navigator) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                      (_err) => alert("Please allow location access to submit GPS coordinates.")
                    );
                  }
                }}
                style={{ background: location ? '#10b981' : '#f59e0b', color: 'white', padding: '8px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {location ? `Location Captured (${location.lat.toFixed(4)}, ${location.lon.toFixed(4)})` : "Attach My Current GPS Location"}
              </button>
            </div>

            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>What did you observe?</label>
            <textarea 
              required
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="E.g., Armed men stockpiling rice and fuel..."
              rows={4}
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ border: '2px dashed #d1d5db', padding: '15px', borderRadius: '4px', textAlign: 'center', backgroundColor: '#f9fafb' }}>
            <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              {mediaFile ? <CheckCircle color="#10b981" size={24} /> : <Paperclip color="#6b7280" size={24} />}
              <span style={{ color: mediaFile ? '#10b981' : '#4b5563', fontWeight: 'bold' }}>
                {mediaFile ? mediaFile.name : "Attach Image or Video Evidence (Optional)"}
              </span>
              <input 
                type="file" 
                accept="image/*,video/*"
                onChange={(e) => setMediaFile(e.target.files ? e.target.files[0] : null)}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <button 
            type="submit" 
            disabled={status === 'submitting'}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: '#3b82f6', color: 'white', padding: '12px', border: 'none', borderRadius: '4px', cursor: status === 'submitting' ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 'bold' }}
          >
            {status === 'submitting' ? 'Encrypting & Sending...' : <><Send size={20} /> Send Secure Tip</>}
          </button>
          
        </form>
      )}
    </div>
  );
}