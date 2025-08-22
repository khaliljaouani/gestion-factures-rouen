// ✅ InvoiceTable.jsx
import React, { useState, useEffect } from 'react';
import './InvoiceTable.css';

const tauxTVA = [
  { value: 20, label: '20%' },
  { value: 10, label: '10%' },
  { value: 5.5, label: '5.5%' },
  { value: 0, label: '0%' }
];

export default function InvoiceTable({ invoiceLines, setInvoiceLines, setRemise }) {
  const [remiseEuro, setRemiseEuro] = useState(0);

  // ✅ Correction : éviter boucle infinie avec setRemise
  useEffect(() => {
    if (typeof remiseEuro === 'number' && !isNaN(remiseEuro)) {
      // Utilisation de setRemise uniquement si fonction valide
      if (typeof setRemise === 'function') {
        setRemise(remiseEuro);
      }
    }
    // ✅ on vérifie bien setRemise aussi pour éviter que la fonction change à chaque render
  }, [remiseEuro, setRemise]);

  const calcHT = l =>
    (parseFloat((l.qty || '').toString().replace(',', '.')) || 0) *
    (parseFloat((l.unitPrice || '').toString().replace(',', '.')) || 0);

  const totalHT = invoiceLines.reduce((sum, l) => sum + calcHT(l), 0);
  const remise = Math.min(remiseEuro, totalHT);
  const totalHTRemise = totalHT - remise;

  const totalTVA = invoiceLines.reduce((sum, l) => {
    const lineShare = totalHT === 0 ? 0 : calcHT(l) / totalHT;
    const lineRemise = remise * lineShare;
    const lineHTApresRemise = calcHT(l) - lineRemise;
    return sum + (lineHTApresRemise * l.vat / 100);
  }, 0);

  const totalTTC = totalHTRemise + totalTVA;

  const updateLine = (idx, field, value) => {
    const updated = invoiceLines.map((line, i) =>
      i === idx ? { ...line, [field]: value } : line
    );
    setInvoiceLines(updated);
  };

  const addLine = () =>
    setInvoiceLines([
      ...invoiceLines,
      { ref: '', designation: '', qty: 1, unitPrice: 0, vat: 20 }
    ]);

  const removeLine = idx =>
    invoiceLines.length > 1 &&
    setInvoiceLines(invoiceLines.filter((_, i) => i !== idx));

  const euro = v =>
    Number(v).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + ' €';

  return (
    <div className="invoice-table-card">
      <table className="invoice-table">
        <thead>
          <tr>
            <th className="ref-zone">Réf.</th>
            <th className="ref-des">Désignation</th>
            <th className="ref-qte">Qté</th>
            <th className="ref-puht">PU HT</th>
            <th className="ref-tva">% TVA</th>
            <th className="ht-total-label">HT total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {invoiceLines.map((l, idx) => (
            <tr key={idx}>
              <td>
                <input
                  className="input input-ref"
                  value={l.ref}
                  onChange={e => updateLine(idx, 'ref', e.target.value)}
                />
              </td>
              <td>
                <textarea
                  className="input input-designation"
                  value={l.designation}
                  onChange={e => updateLine(idx, 'designation', e.target.value)}
                  rows={2}
                />
              </td>
              <td>
                <input
                  className="input input-qty"
                  type="number"
                  min="0"
                  value={l.qty}
                  onChange={e => updateLine(idx, 'qty', Number(e.target.value))}
                />
              </td>
              <td>
                <input
                  className="input input-puht"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  value={l.unitPrice}
                  onChange={e => updateLine(idx, 'unitPrice', e.target.value)}
                />
              </td>
              <td>
                <select
                  className="input input-tva"
                  value={l.vat}
                  onChange={e => updateLine(idx, 'vat', Number(e.target.value))}
                >
                  {tauxTVA.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="ht-total-value">{euro(calcHT(l))}</td>
              <td>
                <button
                  className="remove-btn"
                  onClick={() => removeLine(idx)}
                  disabled={invoiceLines.length === 1}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="invoice-table-actions">
        <button className="add-line-btn" onClick={addLine}>
          + Ajouter une ligne
        </button>
      </div>

      <div className="invoice-table-totaux">
        <div className="totaux-row">
          <span>Remise globale</span>
          <input
            type="number"
            className="input input-remise-global"
            value={remiseEuro}
            min="0"
            max={totalHT}
            onChange={e => setRemiseEuro(Number(e.target.value))}
          />
          <span>€</span>
        </div>
        <div className="totaux-row">
          <span>HT totale</span>
          <span>{euro(totalHTRemise)}</span>
        </div>
        <div className="totaux-row ttc">
          <span>Total TTC</span>
          <span>{euro(totalTTC)}</span>
        </div>
      </div>
    </div>
  );
}
