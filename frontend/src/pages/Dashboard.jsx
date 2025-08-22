import React, { useEffect, useMemo, useState } from 'react';
import {
  Card, Container, Row, Col, Form, Button, Table, Badge, Spinner, Placeholder, ButtonGroup
} from 'react-bootstrap';
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import axios from 'axios';

// ----- axios baseURL (adapte si proxy Vite non configuré) -----
axios.defaults.baseURL = 'http://localhost:4000';
axios.defaults.headers.common['Accept'] = 'application/json';

// ----- utils -----
const asArray = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  return [];
};
const fmtEUR = (n) => (Number(n || 0)).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const monthShort = (d) => new Date(d).toLocaleString('fr-FR', { month: 'short' });
const toISO = (d) => new Date(d).toISOString().slice(0, 10);
const addDays = (iso, delta) => toISO(new Date(new Date(iso).getTime() + delta*86400000));

// ===== Composant =====
const Dashboard = () => {
  // Filtres globaux (pour /daily et top clients)
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  // KPI
  const [summary, setSummary] = useState({
    totalEncaisse: 0,
    facturesNormales: 0,
    facturesCachees: 0,
    devis: 0
  });

  // Données graphiques & listes
  const [daily, setDaily] = useState([]);           // [{type,date,total,count}]
  const [topClients, setTopClients] = useState([]); // [{name,value}]
  const [recent, setRecent] = useState([]);         // démo
  const [loading, setLoading] = useState(false);

  // Jour sélectionné (pie + tableau)
  const [selectedDate, setSelectedDate] = useState('');
  const [dailyDocs, setDailyDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // UI avancée
  const [metricMode, setMetricMode] = useState('count'); // 'count' | 'amount'
  const [docTypeFilter, setDocTypeFilter] = useState('all'); // all | facture | facture_cachee | devis

  const COLORS = ['#2E86AB', '#28A745', '#FFC107', '#DC3545', '#6F42C1', '#20C997', '#6610f2'];

  // --------- Chargement : Summary + Daily + Top clients ---------
  const loadAll = async () => {
    setLoading(true);
    try {
      const params = {};
      if (start) params.start = start;
      if (end) params.end = end;

      const [sumRes, dailyRes, topRes] = await Promise.all([
        axios.get('/api/stats/summary', { params }),
        axios.get('/api/stats/daily', { params }),
        axios.get('/api/stats/top-clients', { params: { ...params, limit: 5 } }),
      ]);

      const dailyArr = asArray(dailyRes);
      setDaily(dailyArr);

      setSummary({
        totalEncaisse: Number(
          sumRes?.data?.totalEncaisse ??
          dailyArr.filter(x => x.type === 'facture').reduce((a, b) => a + Number(b.total || 0), 0)
        ),
        facturesNormales: Number(
          sumRes?.data?.facturesNormales ??
          dailyArr.filter(x => x.type === 'facture').reduce((a, b) => a + Number(b.count || 0), 0)
        ),
        facturesCachees: Number(
          sumRes?.data?.facturesCachees ??
          dailyArr.filter(x => x.type === 'facture_cachee').reduce((a, b) => a + Number(b.count || 0), 0)
        ),
        devis: Number(
          sumRes?.data?.devis ??
          dailyArr.filter(x => x.type === 'devis').reduce((a, b) => a + Number(b.count || 0), 0)
        ),
      });

      const tops = asArray(topRes).map(c => ({ name: c.nom_complet || 'Client', value: Number(c.total || 0) }));
      setTopClients(tops);

      // Derniers mouvements (démo rapide à partir de daily)
      const demoRecents = dailyArr
        .filter(x => x.type === 'facture')
        .slice(-5).reverse()
        .map((x, i) => ({
          id: i + 1, date: x.date,
          client: tops[i % Math.max(1, tops.length)]?.name || 'Client',
          montant: x.total,
          statut: i % 2 ? 'impayee' : 'payee',
        }));
      setRecent(demoRecents);
    } catch (e) {
      console.error('Erreur chargement dashboard:', e);
      setDaily([]); setTopClients([]); setRecent([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); /* on mount */ }, []); // eslint-disable-line

  // --- synchroniser selectedDate avec la dernière date dispo ---
  useEffect(() => {
    if (!daily.length) return;
    const dates = Array.from(new Set(daily.map(d => d.date))).sort();
    setSelectedDate(dates[dates.length - 1]); // plus récente
  }, [daily]);

  // --- toutes les dates disponibles ---
  const allDates = useMemo(() => Array.from(new Set(daily.map(d => d.date))).sort(), [daily]);

  // --- charger les documents du jour quand selectedDate change ---
  useEffect(() => {
    const fetchDocs = async () => {
      if (!selectedDate) { setDailyDocs([]); return; }
      setLoadingDocs(true);
      try {
        const res = await axios.get('/api/stats/daily-docs', { params: { date: selectedDate } });
        setDailyDocs(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error('daily-docs error:', e);
        setDailyDocs([]);
      } finally {
        setLoadingDocs(false);
      }
    };
    fetchDocs();
  }, [selectedDate]);

  // --- navigation jour ---
  const changeDay = (delta) => {
    if (!allDates.length || !selectedDate) return;
    const idx = allDates.indexOf(selectedDate);
    if (idx === -1) return;
    const nextIdx = Math.min(allDates.length - 1, Math.max(0, idx + delta));
    setSelectedDate(allDates[nextIdx]);
  };

  // --- Revenus mensuels (line chart) ---
  const revenusMensuels = useMemo(() => {
    const agg = {};
    daily.forEach(d => {
      if (d.type !== 'facture' || !d.date) return;
      const m = monthShort(d.date);
      agg[m] = (agg[m] || 0) + Number(d.total || 0);
    });
    return Object.entries(agg).map(([mois, revenus]) => ({ mois, revenus }));
  }, [daily]);

  // --- Volumes par type (bar chart) ---
  const docsData = useMemo(() => {
    const c = { facture: 0, facture_cachee: 0, devis: 0 };
    daily.forEach(d => { c[d.type] = (c[d.type] || 0) + Number(d.count || 0); });
    return [
      { type: 'Factures', nombre: c.facture },
      { type: 'Factures cachées', nombre: c.facture_cachee },
      { type: 'Devis', nombre: c.devis },
    ];
  }, [daily]);

  // --- Delta KPI vs période précédente (même durée) ---
  const kpiDelta = useMemo(() => {
    if (!daily.length) return { encaisse: 0, factNorm: 0, factCache: 0, devis: 0 };

    // bornes actuelles (start/end UI) ou min/max des daily
    const s = start || allDates[0];
    const e = end || allDates[allDates.length - 1];
    if (!s || !e) return { encaisse: 0, factNorm: 0, factCache: 0, devis: 0 };

    const days = Math.max(1, Math.round((new Date(e) - new Date(s)) / 86400000) + 1);
    const prevS = addDays(s, -days);
    const prevE = addDays(e, -days);

    const between = (d, a, b) => d >= a && d <= b;

    const nowFact = daily.filter(d => d.type === 'facture' && between(d.date, s, e));
    const nowFactHidden = daily.filter(d => d.type === 'facture_cachee' && between(d.date, s, e));
    const nowDevis = daily.filter(d => d.type === 'devis' && between(d.date, s, e));

    const prevFact = daily.filter(d => d.type === 'facture' && between(d.date, prevS, prevE));
    const prevFactHidden = daily.filter(d => d.type === 'facture_cachee' && between(d.date, prevS, prevE));
    const prevDevis = daily.filter(d => d.type === 'devis' && between(d.date, prevS, prevE));

    const encaisseNow = nowFact.reduce((a, b) => a + Number(b.total || 0), 0);
    const encaissePrev = prevFact.reduce((a, b) => a + Number(b.total || 0), 0);
    const factNow = nowFact.reduce((a, b) => a + Number(b.count || 0), 0);
    const factPrev = prevFact.reduce((a, b) => a + Number(b.count || 0), 0);
    const cacheNow = nowFactHidden.reduce((a, b) => a + Number(b.count || 0), 0);
    const cachePrev = prevFactHidden.reduce((a, b) => a + Number(b.count || 0), 0);
    const devisNow = nowDevis.reduce((a, b) => a + Number(b.count || 0), 0);
    const devisPrev = prevDevis.reduce((a, b) => a + Number(b.count || 0), 0);

    const pct = (n, p) => (p === 0 ? (n > 0 ? 100 : 0) : ((n - p) / p) * 100);

    return {
      encaisse: pct(encaisseNow, encaissePrev),
      factNorm: pct(factNow, factPrev),
      factCache: pct(cacheNow, cachePrev),
      devis: pct(devisNow, devisPrev),
    };
  }, [daily, start, end, allDates]);

  const DeltaChip = ({ value }) => (
    <span
      className={`badge ${value >= 0 ? 'bg-success' : 'bg-danger'}`}
      aria-label={`variation ${Math.abs(value).toFixed(1)}% ${value>=0?'à la hausse':'à la baisse'}`}
      title="Variation vs période précédente de même durée"
      style={{ fontWeight: 600 }}
    >
      {value >= 0 ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
    </span>
  );

  // --- Pie du jour (count / amount) ---
  const pieData = useMemo(() => {
    // agrège par jour sélectionné
    const agg = { facture: { count: 0, amount: 0 }, facture_cachee: { count: 0, amount: 0 }, devis: { count: 0, amount: 0 } };
    daily.filter(d => d.date === selectedDate).forEach(d => {
      agg[d.type].count += Number(d.count || 0);
      agg[d.type].amount += Number(d.total || 0);
    });
    const key = metricMode === 'amount' ? 'amount' : 'count';
    return [
      { name: 'Factures', value: agg.facture[key], color: '#0D6EFD' },
      { name: 'Factures cachées', value: agg.facture_cachee[key], color: '#6f42c1' },
      { name: 'Devis', value: agg.devis[key], color: '#FFC107' },
    ];
  }, [daily, selectedDate, metricMode]);

  // --- Table : filtre par type + totaux ---
  const filteredDocs = useMemo(() => {
    if (docTypeFilter === 'all') return dailyDocs;
    return dailyDocs.filter(d => d.type === docTypeFilter);
  }, [dailyDocs, docTypeFilter]);

  const tableTotals = useMemo(() => {
    const totalMontant = filteredDocs.reduce((a, b) => a + Number(b.montant || 0), 0);
    const totalCount = filteredDocs.length;
    return { totalMontant, totalCount };
  }, [filteredDocs]);

  // --- Export CSV du tableau du jour ---
  const exportCSV = () => {
    const rows = [
      ['Date', 'Client', 'Type', 'Montant', 'Statut'],
      ...filteredDocs.map(d => [
        d.date, d.client, d.type, String(Number(d.montant || 0)).replace('.', ','), d.statut || ''
      ])
    ];
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `documents_${selectedDate || 'jour'}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  // ========== RENDER ==========
  return (
    <Container fluid className="py-4" style={{ background: '#F5F8FB', minHeight: '100vh' }}>
      {/* Titre + filtres globaux */}
      <Row className="align-items-center mb-3">
        <Col><h3 className="mb-0">📊 Tableau de bord</h3></Col>
        <Col md="auto">
          <Form className="d-flex gap-2">
            <Form.Control type="date" value={start} onChange={e => setStart(e.target.value)} />
            <Form.Control type="date" value={end} onChange={e => setEnd(e.target.value)} />
            <Button variant="primary" onClick={loadAll}>Appliquer</Button>
          </Form>
        </Col>
      </Row>

      {/* KPI */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="shadow-sm border-0" style={{ background: '#198754', color: 'white' }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-semibold">Total encaissé</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>
                    {loading ? <Placeholder as="span" animation="wave"><Placeholder xs={6} /></Placeholder> : fmtEUR(summary.totalEncaisse)}
                  </div>
                </div>
                <div className="text-end">
                  <div style={{ fontSize: 28, lineHeight: 1 }}>💶</div>
                  {!loading && <DeltaChip value={kpiDelta.encaisse} />}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm border-0" style={{ background: '#0D6EFD', color: 'white' }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-semibold">Factures (normales)</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>
                    {loading ? <Placeholder as="span" animation="wave"><Placeholder xs={4} /></Placeholder> : summary.facturesNormales}
                  </div>
                </div>
                <div className="text-end">
                  <div style={{ fontSize: 28, lineHeight: 1 }}>🧾</div>
                  {!loading && <DeltaChip value={kpiDelta.factNorm} />}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm border-0" style={{ background: '#6f42c1', color: 'white' }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-semibold">Factures cachées</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>
                    {loading ? <Placeholder as="span" animation="wave"><Placeholder xs={4} /></Placeholder> : summary.facturesCachees}
                  </div>
                </div>
                <div className="text-end">
                  <div style={{ fontSize: 28, lineHeight: 1 }}>🕶️</div>
                  {!loading && <DeltaChip value={kpiDelta.factCache} />}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm border-0" style={{ background: '#FFC107', color: '#222' }}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="fw-semibold">Devis</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>
                    {loading ? <Placeholder as="span" animation="wave"><Placeholder xs={4} /></Placeholder> : summary.devis}
                  </div>
                </div>
                <div className="text-end">
                  <div style={{ fontSize: 28, lineHeight: 1 }}>📄</div>
                  {!loading && <DeltaChip value={kpiDelta.devis} />}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {loading && <div className="d-flex align-items-center gap-2 mb-3" aria-live="polite">
        <Spinner size="sm" /> <span>Chargement des données…</span>
      </div>}

      {/* Row 1 : Revenus + Top clients */}
      <Row className="g-3 mb-4">
        <Col md={6}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white">Évolution des revenus</Card.Header>
            <Card.Body style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenusMensuels}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenus" stroke="#17a2b8" strokeWidth={3} dot />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white">Top 5 clients</Card.Header>
            <Card.Body style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topClients} dataKey="value" nameKey="name" outerRadius={110} label>
                    {topClients.map((entry, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Pie>
                  <Legend /><Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Row 2 : Volumes + Pie jour avec change jour + toggle Nombre/Montant */}
      <Row className="g-3 mb-4">
        <Col md={6}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white">Volume de documents émis</Card.Header>
            <Card.Body style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={docsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" /><YAxis /><Tooltip /><Legend />
                  <Bar dataKey="nombre" fill="#6f42c1" barSize={45} />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <span>Répartition par type (jour)</span>
              <div className="d-flex align-items-center gap-2">
                <small className="text-muted">{selectedDate || '—'}</small>
                <Form.Check
                  type="switch"
                  id="metricSwitch"
                  label={metricMode === 'count' ? 'Nombre' : 'Montant €'}
                  checked={metricMode === 'amount'}
                  onChange={(e) => setMetricMode(e.target.checked ? 'amount' : 'count')}
                />
              </div>
            </Card.Header>
            <Card.Body style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={110} label>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Legend /><Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
            <Card.Footer className="bg-white">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                  <Button size="sm" variant="outline-secondary"
                    onClick={() => changeDay(-1)}
                    disabled={!allDates.length || allDates.indexOf(selectedDate) <= 0}>◀</Button>
                  <Form.Control type="date" size="sm" style={{ width: 160 }}
                    value={selectedDate || ''} onChange={(e) => setSelectedDate(e.target.value)}
                    min={allDates[0]} max={allDates[allDates.length - 1]} />
                  <Button size="sm" variant="outline-secondary"
                    onClick={() => changeDay(1)}
                    disabled={!allDates.length || allDates.indexOf(selectedDate) === allDates.length - 1}>▶</Button>
                </div>
                <small className="text-muted">
                  Total {metricMode === 'count' ? 'documents' : 'montant'} : {
                    pieData.reduce((a, b) => a + (b.value || 0), 0)
                      .toLocaleString('fr-FR', metricMode === 'amount'
                        ? { style: 'currency', currency: 'EUR' }
                        : undefined)
                  }
                </small>
              </div>
            </Card.Footer>
          </Card>
        </Col>
      </Row>

      {/* Documents du jour : filtres + export + totaux */}
      <Row className="g-3 mb-4">
        <Col>
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <span>Documents du jour</span>
              <div className="d-flex align-items-center gap-2">
                <ButtonGroup aria-label="Filtre type">
                  <Button size="sm" variant={docTypeFilter==='all'?'primary':'outline-primary'} onClick={()=>setDocTypeFilter('all')}>Tous</Button>
                  <Button size="sm" variant={docTypeFilter==='facture'?'primary':'outline-primary'} onClick={()=>setDocTypeFilter('facture')}>Factures</Button>
                  <Button size="sm" variant={docTypeFilter==='facture_cachee'?'primary':'outline-primary'} onClick={()=>setDocTypeFilter('facture_cachee')}>Cachées</Button>
                  <Button size="sm" variant={docTypeFilter==='devis'?'primary':'outline-primary'} onClick={()=>setDocTypeFilter('devis')}>Devis</Button>
                </ButtonGroup>
                <Button size="sm" variant="success" onClick={exportCSV}>Export CSV</Button>
              </div>
            </Card.Header>

            <Card.Body className="p-0">
              <Table hover responsive className="mb-0">
                <thead>
                  <tr>
                    <th style={{ width: 140 }}>Date</th>
                    <th>Client</th>
                    <th style={{ width: 180 }}>Type</th>
                    <th style={{ width: 150 }}>Montant</th>
                    <th style={{ width: 140 }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingDocs && (
                    <tr>
                      <td colSpan={5} className="py-3">
                        <Placeholder as="div" animation="wave" className="px-3">
                          <Placeholder xs={2} /> <Placeholder xs={3} /> <Placeholder xs={2} /> <Placeholder xs={2} />
                        </Placeholder>
                      </td>
                    </tr>
                  )}
                  {!loadingDocs && filteredDocs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted">
                        Aucun document pour {selectedDate || '—'}
                      </td>
                    </tr>
                  )}
                  {!loadingDocs && filteredDocs.map((d, i) => (
                    <tr key={i}>
                      <td>{d.date}</td>
                      <td>{d.client}</td>
                      <td>
                        {d.type === 'facture' && <Badge bg="primary">Facture</Badge>}
                        {d.type === 'facture_cachee' && <Badge bg="dark">Facture cachée</Badge>}
                        {d.type === 'devis' && <Badge bg="warning" text="dark">Devis</Badge>}
                      </td>
                      <td>{fmtEUR(d.montant)}</td>
                      <td>
                        {d.type === 'devis' ? (
                          <Badge bg="info">Devis</Badge>
                        ) : d.statut === 'impayee' ? (
                          <Badge bg="danger">Impayée</Badge>
                        ) : d.statut === 'cachee' ? (
                          <Badge bg="secondary">Cachée</Badge>
                        ) : (
                          <Badge bg="success">Payée</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {!loadingDocs && filteredDocs.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={2} className="text-end fw-semibold">Totaux</td>
                      <td>{tableTotals.totalCount} doc(s)</td>
                      <td>{fmtEUR(tableTotals.totalMontant)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

    
    </Container>
  );
};

export default Dashboard;
