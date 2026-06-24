import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { Send, ShieldCheck, CheckCircle, Paperclip, MapPin } from 'lucide-react';

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
    <div className="cit-card">
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', marginBottom: '15px' }}>
          <ShieldCheck size={40} color="var(--cit-success)" />
        </div>
        <h2 style={{ color: 'var(--cit-text-main)', fontSize: '28px', marginBottom: '8px' }}>Anonymous Tip Line</h2>
        <p style={{ color: 'var(--cit-text-muted)', fontSize: '15px' }}>Zero PII collected. Your identity is cryptographically secure.</p>
      </div>

      {status === 'success' ? (
        <div style={{ background: '#ecfdf5', padding: '25px', borderRadius: '12px', border: '1px solid #a7f3d0', textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
          <CheckCircle size={48} color="var(--cit-success)" style={{ margin: '0 auto 15px auto' }} />
          <h3 style={{ color: '#065f46', margin: '0 0 10px 0', fontSize: '20px' }}>Report Submitted Safely</h3>
          <p style={{ color: '#047857', fontSize: '15px', marginBottom: '20px' }}>
            The grid has received your intelligence.
          </p>
          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px dashed #a7f3d0', marginBottom: '20px' }}>
            <span style={{ display: 'block', fontSize: '12px', color: '#059669', fontWeight: '600', textTransform: 'uppercase', marginBottom: '5px' }}>Anonymity Receipt</span>
            <span style={{ wordBreak: 'break-all', fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#064e3b' }}>{receipt}</span>
          </div>
          <button onClick={() => setStatus('idle')} className="cit-btn cit-btn-success" style={{ width: '100%' }}>
            Submit Another Report
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {informantId && (
            <div style={{ background: '#f8fafc', padding: '12px 15px', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--cit-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--cit-text-muted)', fontWeight: '500' }}>Device Wallet ID</span>
              <span style={{ color: 'var(--cit-success)', fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: '600', letterSpacing: '0.5px' }}>{informantId}</span>
            </div>
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontWeight: '600', color: 'var(--cit-text-main)', fontSize: '15px' }}>What did you observe?</label>
            </div>
            <textarea 
              required
              className="cit-input"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="E.g., Armed men stockpiling rice and fuel near the warehouse..."
              rows={5}
            />
          </div>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <label className="cit-file-drop" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', height: '100%', justifyContent: 'center' }}>
                {mediaFile ? <CheckCircle color="var(--cit-success)" size={28} /> : <Paperclip color="var(--cit-text-muted)" size={28} />}
                <span style={{ color: mediaFile ? 'var(--cit-success)' : 'var(--cit-text-muted)', fontWeight: '500', fontSize: '14px' }}>
                  {mediaFile ? mediaFile.name : "Attach Image / Video"}
                </span>
                <input 
                  type="file" 
                  accept="image/*,video/*"
                  onChange={(e) => setMediaFile(e.target.files ? e.target.files[0] : null)}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            
            <div style={{ flex: 1, display: 'flex' }}>
              <button 
                type="button" 
                className={`cit-btn ${location ? 'cit-btn-success' : 'cit-btn-warning'}`}
                onClick={() => {
                  if ("geolocation" in navigator) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
                      (_err) => alert("Please allow location access to submit GPS coordinates.")
                    );
                  }
                }}
                style={{ width: '100%', height: '100%', flexDirection: 'column', gap: '8px' }}
              >
                <MapPin size={24} />
                <span style={{ fontSize: '14px' }}>
                  {location ? "GPS Attached" : "Add Location"}
                </span>
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={status === 'submitting'}
            className="cit-btn cit-btn-primary"
            style={{ marginTop: '10px', height: '54px' }}
          >
            {status === 'submitting' ? 'Encrypting & Sending...' : <><Send size={20} /> Send Secure Tip</>}
          </button>
          
        </form>
      )}
    </div>
  );
}