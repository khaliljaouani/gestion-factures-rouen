import { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

import 'bootstrap/dist/css/bootstrap.min.css';



function App() {
  const [message, setMessage] = useState('Chargement...');

  useEffect(() => {
    fetch('http://localhost:4000')
      .then(res => res.text())
      .then(data => setMessage(data))
      .catch(err => setMessage("❌ Erreur d'appel API"));
  }, []);

  return (
    <div style={{ padding: '2rem', fontSize: '1.5rem' }}>
      <h1>Interface React</h1>
      <p>{message}</p>
    </div>
  );
}

export default App;
