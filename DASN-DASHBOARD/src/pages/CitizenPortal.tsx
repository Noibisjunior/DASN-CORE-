import ReporterForm from '../components/ReporterForm';

export default function CitizenPortal() {
  return (
    <div 
      className="citizen-portal" 
      style={{ 
        padding: '40px 20px', 
        fontFamily: 'var(--font-sans)', 
        background: 'linear-gradient(135deg, var(--cit-bg) 0%, #eef2f6 100%)', 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <ReporterForm />
    </div>
  );
}
