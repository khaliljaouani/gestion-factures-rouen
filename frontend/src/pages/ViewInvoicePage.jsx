import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const ViewInvoicePage = () => {
  const { invoiceId } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedInvoice = localStorage.getItem(`invoice-${invoiceId}`);
    if (storedInvoice) {
      setInvoice(JSON.parse(storedInvoice));
    } else {
      // Fallback pour les données d'exemple si non trouvé dans localStorage (pour la démo)
      if (invoiceId === 'FA2024-001') {
        setInvoice({
          numero: 'FA2024-001', clientName: 'Client Alpha (Exemple)', immatriculation: 'AA-123-BB', dateFacture: '2024-01-10',
          conditionsReglement: 'À réception', objet: 'Prestation Alpha', modePaiement: 'Virement bancaire',
          items: [{ id: 1, ref: 'REF001', designationContent: '<p>Service A</p>', quantite: 2, unite: 'U', puTTC: 600, remiseValeur: 0, remiseType: 'percent', tva: 20, classification: 'Service' }],
          totals: { ht: 1000, tva: 200, ttc: 1200 },
          statut: 'Payée'
        });
      }
    }
    setLoading(false);
  }, [invoiceId]);

  if (loading) return <p>Chargement...</p>;
  if (!invoice) return (
    <div>
        <h1>Facture non trouvée</h1>
        <p>ID: {invoiceId}</p>
        <Link to="/factures" className="btn btn-primary">Retour à la liste</Link>
    </div>
    );

  return (
    <>
      <div className="page-header-display">
        <h1>{invoice.numero}</h1>
        <div className="header-actions-display">
          <Link to={`/factures/modifier/${invoiceId}`} className="btn btn-primary"><i className="fas fa-pencil-alt"></i> Modifier</Link>
          <div className="btn-group"> <button type="button" className="btn btn-outline-secondary dropdown-toggle" data-toggle="dropdown"><i className="fas fa-paper-plane"></i></button> <div className="dropdown-menu"><a className="dropdown-item" href="#!">Envoyer par email</a> <a className="dropdown-item" href="#!">Marquer comme envoyée</a></div> </div>
          <button className="btn btn-outline-secondary"><i className="fas fa-eye"></i></button>
          <button className="btn btn-outline-secondary"><i className="fas fa-ellipsis-v"></i></button>
        </div>
      </div>
      <p className="invoice-summary-text">
        Facture du {invoice.dateFacture ? new Date(invoice.dateFacture).toLocaleDateString('fr-FR') : '-'} pour {invoice.clientName || 'N/A'} de {invoice.totals?.ttc?.toFixed(2) || '0.00'} € TTC
      </p>

      <div className="status-stepper">
        <div className={`status-step ${invoice.statut === 'Brouillon' || invoice.statut === 'Enregistré' || invoice.statut === 'Payé' ? 'completed' : ''} ${invoice.statut === 'Brouillon' ? 'active' : ''}`}><div className="dot"></div><span className="label">Brouillon</span></div>
        <div className={`status-step ${invoice.statut === 'Enregistré' || invoice.statut === 'Payé' ? 'completed' : ''} ${invoice.statut === 'Enregistré' ? 'active' : ''}`}><div className="dot"></div><span className="label">Enregistré</span></div>
        <div className={`status-step ${invoice.statut === 'Payé' ? 'completed active' : ''}`}><div className="dot"></div><span className="label">Payé</span></div>
        <div className="status-step"><div className="dot"></div><span className="label">Rapproché</span></div>
      </div>

      <div className="invoice-main-layout">
        <div className="invoice-info-col">
          <div className="details-card-display page-section">
            <p><strong>Date facture</strong>{invoice.dateFacture ? new Date(invoice.dateFacture).toLocaleDateString('fr-FR') : '-'}</p>
            <p><strong>Date d'échéance</strong>{invoice.conditionsReglement || '-'}</p>
            <p><strong>Mode de paiement</strong>{invoice.modePaiement || '-'}</p>
          </div>
          <div className="details-card-display client-info-box page-section">
             <p style={{color: '#007bff', fontWeight:500, marginBottom: '0.3rem'}}>{invoice.clientName || 'N/A'}</p>
             <p>{invoice.immatriculation || '-'}</p>
             {/* Plus de détails client ici */}
          </div>
        </div>

        <div className="invoice-items-col">
          <div className="manage-purchase-price-display page-section" style={{padding: '10px 20px'}}>
            <input type="checkbox" id="gererPrixAchatDisplay" className="form-check-input" defaultChecked={invoice.gererPrixAchat || false} readOnly/>
            <label htmlFor="gererPrixAchatDisplay" className="form-check-label" style={{fontWeight:'normal'}}>Gérer le prix d'achat</label>
          </div>
          <div className="lines-table-display-outer page-section">
            <table className="lines-table-display">
              <thead>
                <tr>
                  <th>Réf.</th>
                  <th>Désignation</th>
                  <th className="text-right">Qté</th>
                  <th className="text-right">PU HT</th>
                  <th className="text-right">Remise</th>
                  <th className="text-right">TVA</th>
                  <th className="text-right">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items && invoice.items.map(item => (
                  <React.Fragment key={item.id}>
                    <tr>
                      <td>{item.ref}</td>
                      <td dangerouslySetInnerHTML={{ __html: item.designationContent || '' }}></td>
                      <td className="text-right">{item.quantite} {item.unite}</td>
                      <td className="text-right">
                        {
                          (() => {
                            const puTTC = parseFloat(item.puTTC) || 0;
                            const tvaRate = parseFloat(item.tva) || 0;
                            return (puTTC / (1 + tvaRate / 100)).toFixed(2);
                          })()
                        }
                      </td>
                      <td className="text-right">{item.remiseType === 'percent' ? `${parseFloat(item.remiseValeur).toFixed(2)}%` : `${parseFloat(item.remiseValeur).toFixed(2)} €`}</td>
                      <td className="text-right">{parseFloat(item.tva).toFixed(2)}%</td>
                      <td className="text-right">
                        {
                          (() => {
                            const qte = parseFloat(item.quantite) || 0;
                            const puTTC = parseFloat(item.puTTC) || 0;
                            const tvaRate = parseFloat(item.tva) || 0;
                            let itemTotalTTC = qte * puTTC;
                             if (item.remiseType === 'percent' && item.remiseValeur > 0) {
                                itemTotalTTC -= itemTotalTTC * (parseFloat(item.remiseValeur)/100);
                            } else if (item.remiseType === 'fixed' && item.remiseValeur > 0) {
                                itemTotalTTC -= parseFloat(item.remiseValeur);
                            }
                            return (itemTotalTTC / (1 + tvaRate / 100)).toFixed(2);
                          })()
                        } €
                      </td>
                    </tr>
                    {item.classification && (
                         <tr><td></td><td colSpan="6" className="item-classification-display"><strong>Classification:</strong> {item.classification}</td></tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            <div className="totals-display-section">
              <div><span>Total HT</span> <span>{invoice.totals?.ht?.toFixed(2) || '0.00'} €</span></div>
              <div><span>Total TVA</span> <span>{invoice.totals?.tva?.toFixed(2) || '0.00'} €</span></div>
              <div><span>Total TTC</span> <span>{invoice.totals?.ttc?.toFixed(2) || '0.00'} €</span></div>
              <div className="net-a-payer-display"><strong>NET À PAYER</strong> <strong>{invoice.totals?.ttc?.toFixed(2) || '0.00'} €</strong></div>
            </div>
          </div>
        </div>

        <div className="invoice-pdf-col">
          <div className="pdf-preview-card page-section">
            <div className="pdf-preview-controls-display">
              <div>
                <button className="btn btn-sm btn-outline-secondary"><i className="fas fa-search-minus"></i></button>
                <input type="text" className="form-control form-control-sm d-inline-block mx-1" defaultValue="1 sur 1" style={{width: '60px', textAlign:'center'}}/>
                <button className="btn btn-sm btn-outline-secondary"><i className="fas fa-search-plus"></i></button>
                <select className="custom-select custom-select-sm d-inline-block ml-2" style={{width: 'auto'}}> <option >Zoom auto.</option></select>
              </div>
              <div>
                 <button className="btn btn-sm btn-outline-secondary" title="Télécharger"><i className="fas fa-download"></i></button>
              </div>
            </div>
            <img src="https://via.placeholder.com/280x396.png?text=Aperçu+PDF" alt="Aperçu Facture PDF" className="pdf-preview-image-display"/>
            <div className="pdf-model-info-display">Modèle de document Standard 2 (<a href="#!">Modifier</a>)</div>
          </div>
        </div>
      </div>

      <div className="bottom-sections row">
        <div className="col-md-6">
            <div className="event-history-card-display page-section">
                <h5>Historique des évènements</h5>
                <table className="table table-sm table-borderless event-history-table-display">
                    <thead><tr><th>Utilisateur</th><th>Évènement</th><th>Document</th><th>Date</th></tr></thead>
                    <tbody>
                        {/* Simuler des données d'historique */}
                        <tr><td>Utilisateur Exempl</td><td>Création</td><td>Facture ({invoice.numero})</td><td>{invoice.dateFacture ? new Date(invoice.dateFacture).toLocaleDateString('fr-FR') : '-'}</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div className="col-md-6">
            <div className="conversation-card-display page-section">
                <h5>Conversation</h5>
                <textarea className="form-control mb-2" placeholder="Écrire..."></textarea>
                <button className="btn btn-sm btn-outline-primary">Envoyer</button>
            </div>
        </div>
    </div>
    </>
  );
};

export default ViewInvoicePage;
