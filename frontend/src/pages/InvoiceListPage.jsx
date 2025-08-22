import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Row, Col, Card, Container } from 'react-bootstrap';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    chiffreAffairesFactures: 0,
    chiffreAffairesDevis: 0,
    totalTTCAnnuel: 0,
    tauxConversion: 0,
    encaissementsMensuels: [],
    evolutionAnnuelle: [],
    repartition: {},
    topClients: [],
    timeline: [],
    facturesAttente: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:4000/api/statistiques/all')
      .then(res => {
        console.log("✅ Données reçues :", res.data);
        setStats(res.data || {});
        setLoading(false);
      })
      .catch(err => {
        console.error('Erreur stats :', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-center mt-5">Chargement...</p>;

  const {
    chiffreAffairesFactures = 0,
    chiffreAffairesDevis = 0,
    totalTTCAnnuel = 0,
    tauxConversion = 0,
    encaissementsMensuels = [],
    evolutionAnnuelle = [],
    repartition = {},
    topClients = [],
    timeline = [],
    facturesAttente = []
  } = stats;

  const chartBarData = {
    labels: encaissementsMensuels.map(e => e.mois),
    datasets: [
      {
        label: 'Encaissements',
        data: encaissementsMensuels.map(e => Number(e.total) || 0),
        backgroundColor: '#0d6efd'
      }
    ]
  };

  const chartLineData = {
    labels: evolutionAnnuelle.map(e => e.mois),
    datasets: [
      {
        label: 'Chiffre d\'affaires',
        data: evolutionAnnuelle.map(e => Number(e.total) || 0),
        borderColor: '#198754',
        tension: 0.3,
        fill: false
      }
    ]
  };

  const chartPieData = {
    labels: ['Factures', 'Devis'],
    datasets: [
      {
        data: [Number(repartition.factures) || 0, Number(repartition.devis) || 0],
        backgroundColor: ['#6610f2', '#20c997']
      }
    ]
  };

  return (
    <Container fluid className="mt-4">
      <h2 className="mb-4 text-primary">
        <i className="bi bi-bar-chart-fill me-2" /> Tableau de bord
      </h2>

      <Row className="mb-4">
        <Col md={3}><Card body><strong>Factures :</strong><br /> {(Number(chiffreAffairesFactures) || 0).toFixed(2)} €</Card></Col>
        <Col md={3}><Card body><strong>Devis :</strong><br /> {(Number(chiffreAffairesDevis) || 0).toFixed(2)} €</Card></Col>
        <Col md={3}><Card body><strong>Total TTC :</strong><br /> {(Number(totalTTCAnnuel) || 0).toFixed(2)} €</Card></Col>
        <Col md={3}><Card body><strong>Taux conversion :</strong><br /> {(Number(tauxConversion) || 0).toFixed(2)} %</Card></Col>
      </Row>

      <Row className="mb-4">
        <Col md={6}><Card body><h6>📅 Encaissements mensuels</h6><Bar data={chartBarData} /></Card></Col>
        <Col md={6}><Card body><h6>✅ Evolution annuelle</h6><Line data={chartLineData} /></Card></Col>
      </Row>

      <Row className="mb-4">
        <Col md={6}><Card body><h6>📊 Répartition Factures / Devis</h6><Pie data={chartPieData} /></Card></Col>
        <Col md={6}><Card body>
          <h6>👤 Principaux clients</h6>
          <ul className="mb-0">
            {Array.isArray(topClients) && topClients.map((client, i) => (
              <li key={i}>{client.nom} - {(Number(client.total) || 0).toFixed(2)} €</li>
            ))}
          </ul>
        </Card></Col>
      </Row>

      <Row className="mb-4">
        <Col md={6}><Card body>
          <h6>⏰ Derniers documents</h6>
          <ul className="mb-0">
            {Array.isArray(timeline) && timeline.map((doc, i) => (
              <li key={i}>{doc.numero} - {doc.date}</li>
            ))}
          </ul>
        </Card></Col>

        <Col md={6}><Card body>
          <h6>🔔 Factures en attente</h6>
          <ul className="mb-0">
            {Array.isArray(facturesAttente) && facturesAttente.map((f, i) => (
              <li key={i}>{f.numero} - {(Number(f.montant_ttc) || 0).toFixed(2)} €</li>
            ))}
          </ul>
        </Card></Col>
      </Row>
    </Container>
  );
};

export default Dashboard;
