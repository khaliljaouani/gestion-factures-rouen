import { useEffect, useState } from 'react';
import axios from 'axios';

export default function NextNumbersBadge() {
  const [nexts, setNexts] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const { data } = await axios.get('http://localhost:4000/api/counters/next', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNexts(data); // { nextNormal, nextCachee, nextDevis }
      } catch (_) {}
    })();
  }, []);

  if (!nexts) return null;
  return (
    <div style={{ margin: '8px 0 12px', color: '#555', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <span>Prochain <strong>Facture</strong> : <code>{nexts.nextNormal}</code></span>
      <span>Prochain <strong>Facture cachée</strong> : <code>{nexts.nextCachee}</code></span>
      <span>Prochain <strong>Devis</strong> : <code>{nexts.nextDevis}</code></span>
    </div>
  );
}
