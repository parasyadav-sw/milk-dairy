import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Landmark, ArrowRight, ShieldAlert, CheckCircle, Search, Clock, IndianRupee } from 'lucide-react';
import { Toast } from '../components/Toast';
import { Modal, ModalBody, ModalFooter } from '../components/Modal';

export const Payments: React.FC = () => {
  const { collections, payments, processPayment, farmers } = useDatabase();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [activeFarmerPayout, setActiveFarmerPayout] = useState<any | null>(null);
  const [txnRef, setTxnRef] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ msg, type }); };

  const aggregatedPending: { [key: string]: any } = {};
  collections.forEach(col => {
    if (col.paymentStatus === 'PENDING') {
      const farmer = farmers.find(f => f.id === col.farmerId);
      if (!aggregatedPending[col.farmerId]) {
        aggregatedPending[col.farmerId] = { farmerId: col.farmerId, farmerName: farmer?.name || 'Farmer', village: farmer?.village || '', mobile: farmer?.mobile || '', litres: 0, amount: 0 };
      }
      aggregatedPending[col.farmerId].litres += col.quantityLitres;
      aggregatedPending[col.farmerId].amount += col.totalAmount;
    }
  });

  const pendingPaymentsList = Object.values(aggregatedPending).filter((item: any) =>
    item.farmerName.toLowerCase().includes(search.toLowerCase()) || item.farmerId.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenPayout = (farmerPay: any) => {
    if (user?.role !== 'ADMIN') { triggerToast('Only admins can process payments.', 'error'); return; }
    setActiveFarmerPayout(farmerPay); setTxnRef(`TXN-${Date.now()}`);
  };

  const handleConfirmPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFarmerPayout) return;
    try { await processPayment(activeFarmerPayout.farmerId, txnRef); triggerToast(`Paid ₹${activeFarmerPayout.amount.toFixed(2)}!`); setActiveFarmerPayout(null); }
    catch (err: any) { triggerToast(err.message || 'Failed', 'error'); }
  };

  return (
    <div className="space-y-8">
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">Manage customer payouts and settlements</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-warm-100">
            <h3 className="section-title">Pending settlements</h3>
            <span className="badge bg-red-50 text-error border border-red-200/60">{pendingPaymentsList.length} due</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer..." className="input pl-9" />
          </div>
          {pendingPaymentsList.length > 0 ? (
            <div className="space-y-3">
              {pendingPaymentsList.map((item: any) => (
                <div key={item.farmerId} className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground text-body">{item.farmerName}</span>
                      <span className="label bg-warm-100 text-muted px-1.5 py-0.5 rounded font-mono">{item.farmerId}</span>
                    </div>
                    <p className="text-body-sm text-muted">{item.village} • {item.mobile}</p>
                    <span className="badge bg-primary-50 text-primary-700 border border-primary-200/60">Pending: {item.litres.toFixed(1)} L</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="label block">Due</span>
                      <span className="text-data-lg font-display text-error">₹{item.amount.toLocaleString()}</span>
                    </div>
                    {user?.role === 'ADMIN' && <button onClick={() => handleOpenPayout(item)} className="p-2.5 bg-primary-700 hover:bg-primary-800 text-white rounded-xl shadow-soft transition-all"><ArrowRight className="w-4 h-4" /></button>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state card p-10">
              <CheckCircle className="w-10 h-10 text-forest-600 mb-3" />
              <p className="font-medium text-warm-700">All cleared</p>
              <p className="text-body-sm text-muted mt-1">No pending payments.</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-warm-100">
            <Landmark className="w-4 h-4 text-muted" /><h3 className="section-title">Settlement history</h3>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {payments.map(p => {
              const fName = farmers.find(f => f.id === p.farmerId)?.name || p.farmerName || 'Customer';
              return (
                <div key={p.id} className="p-4 bg-warm-50 border border-warm-100 rounded-xl text-body-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{fName}</span>
                    <span className="text-forest-700 font-medium font-mono">₹{p.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted label mt-1.5">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {p.paymentDate}</span>
                    <span className="font-mono">{p.transactionRef}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal open={!!activeFarmerPayout} onClose={() => setActiveFarmerPayout(null)} size="md">
          <ModalBody>
            <h3 className="font-display text-display-md text-foreground mb-4">Authorize payout</h3>
            <p className="text-body-sm text-muted mb-5">Settling for <strong>{activeFarmerPayout?.farmerName}</strong> — {activeFarmerPayout?.litres.toFixed(1)} L</p>
            <form onSubmit={handleConfirmPayout} className="space-y-4">
              <div className="space-y-2">
                <label className="label">Amount</label>
                <div className="p-3 bg-red-50 border border-red-200/60 rounded-xl text-error font-medium text-data-lg">₹{activeFarmerPayout?.amount.toFixed(2)}</div>
              </div>
              <div className="space-y-2"><label className="label">Transaction ref</label><input type="text" required value={txnRef} onChange={(e) => setTxnRef(e.target.value)} className="input" /></div>
              <ModalFooter className="px-0 pt-4 pb-0 border-t border-warm-100">
                <button type="button" onClick={() => setActiveFarmerPayout(null)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Approve & pay</button>
              </ModalFooter>
            </form>
          </ModalBody>
      </Modal>
    </div>
  );
};
