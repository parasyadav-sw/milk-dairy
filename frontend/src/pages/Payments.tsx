import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { useAuth } from '../context/AuthContext';
import { Landmark, ArrowRight, ShieldAlert, CheckCircle, Search } from 'lucide-react';

export const Payments: React.FC = () => {
  const { collections, payments, processPayment, farmers } = useDatabase();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [activeFarmerPayout, setActiveFarmerPayout] = useState<any | null>(null);
  const [txnRef, setTxnRef] = useState('');
  
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Group pending collections by farmer ID
  const aggregatedPending: { [key: string]: any } = {};
  collections.forEach(col => {
    if (col.paymentStatus === 'PENDING') {
      const farmer = farmers.find(f => f.id === col.farmerId);
      if (!aggregatedPending[col.farmerId]) {
        aggregatedPending[col.farmerId] = {
          farmerId: col.farmerId,
          farmerName: farmer?.name || 'Farmer',
          village: farmer?.village || 'Village',
          mobile: farmer?.mobile || '',
          litres: 0,
          amount: 0
        };
      }
      aggregatedPending[col.farmerId].litres += col.quantityLitres;
      aggregatedPending[col.farmerId].amount += col.totalAmount;
    }
  });

  const pendingPaymentsList = Object.values(aggregatedPending).filter((item: any) => {
    return item.farmerName.toLowerCase().includes(search.toLowerCase()) || 
           item.farmerId.toLowerCase().includes(search.toLowerCase());
  });

  const handleOpenPayout = (farmerPay: any) => {
    if (user?.role !== 'ADMIN') {
      triggerToast('Access denied: Only Admins can process payments.', 'error');
      return;
    }
    setActiveFarmerPayout(farmerPay);
    setTxnRef(`TXN-${Date.now()}`);
  };

  const handleConfirmPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFarmerPayout) return;

    try {
      await processPayment(activeFarmerPayout.farmerId, txnRef);
      triggerToast(`Paid ₹${activeFarmerPayout.amount.toFixed(2)} to ${activeFarmerPayout.farmerName} successfully!`);
      setActiveFarmerPayout(null);
    } catch (err: any) {
      triggerToast(err.message || 'Payment execution failed', 'error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">Farmer Payouts</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-0.5">Manage payouts, process bank checks, and review financial ledgers</p>
      </div>

      {/* Grid of Pending balances and Payments history */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Pending Settlements Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-slate-950 dark:text-white text-base">Pending settlements</h3>
            <span className="text-xs bg-rose-50 text-rose-700 px-3 py-1 rounded-full font-bold">
              {pendingPaymentsList.length} Farmers Due
            </span>
          </div>

          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search farmer name or ID..."
              className="w-full bg-white dark:bg-slate-900 border rounded-xl pl-9 pr-4 py-2.5 text-xs font-semibold focus:outline-none"
            />
          </div>

          {pendingPaymentsList.length > 0 ? (
            <div className="space-y-3">
              {pendingPaymentsList.map((item: any) => (
                <div key={item.farmerId} className="glass-card p-5 rounded-3xl border border-slate-200/50 dark:border-slate-800 shadow-glass flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{item.farmerName}</span>
                      <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold px-1.5 py-0.5 rounded font-mono">{item.farmerId}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold">
                      Village: <span className="text-slate-800 dark:text-slate-350">{item.village}</span> • Mobile: <span className="font-mono text-slate-700 dark:text-slate-300">{item.mobile}</span>
                    </p>
                    <span className="inline-block text-[10px] text-dairy-650 bg-dairy-50/50 dark:bg-dairy-950/20 px-2 py-0.5 rounded-md font-bold">
                      Pending Yield: {item.litres.toFixed(1)} L
                    </span>
                  </div>

                  <div className="flex items-center gap-5 justify-between sm:justify-end">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Due Amount</span>
                      <span className="text-base font-extrabold text-rose-600">₹ {item.amount.toLocaleString()}</span>
                    </div>
                    {user?.role === 'ADMIN' && (
                      <button
                        onClick={() => handleOpenPayout(item)}
                        className="inline-flex items-center justify-center p-2.5 bg-dairy-600 hover:bg-dairy-700 text-white rounded-xl shadow-md transition transform active:scale-95"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700 dark:text-slate-350">All Accounts Cleared</h3>
              <p className="text-xs text-slate-450 mt-1">No pending collections are waiting to be paid.</p>
            </div>
          )}
        </div>

        {/* Payment History Column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <Landmark className="w-5 h-5 text-slate-500" />
            <h3 className="font-bold text-slate-950 dark:text-white text-base">Settlement Logs</h3>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {payments.map((p) => {
              const fName = farmers.find(f => f.id === p.farmerId)?.name || p.farmerName || 'Farmer';
              return (
                <div key={p.id} className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-900 dark:text-white font-bold">{fName}</span>
                    <span className="text-emerald-600 font-bold font-mono">₹{p.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 font-bold text-[10px] mt-2">
                    <span>{p.paymentDate}</span>
                    <span className="font-mono">Ref: {p.transactionRef || p.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Payout Confirmation dialog modal */}
      {activeFarmerPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 md:p-8 animate-fade-in">
            <div className="flex items-center gap-2 text-rose-600 mb-4">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Authorize Settlement Payout
              </h3>
            </div>
            
            <p className="text-xs text-slate-500 font-semibold mb-5">
              Confirm bank transaction for farmer <span className="font-bold text-slate-800 dark:text-white">{activeFarmerPayout.farmerName}</span>. This will settle <span className="font-bold text-slate-850 dark:text-slate-100">{activeFarmerPayout.litres.toFixed(1)} L</span> of milk collection records.
            </p>

            <form onSubmit={handleConfirmPayout} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Settlement Amount</label>
                <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 font-extrabold text-lg rounded-xl border border-rose-100 dark:border-rose-900/50">
                  ₹ {activeFarmerPayout.amount.toFixed(2)}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transaction Ref ID (e.g. Bank IMPS / UTR)</label>
                <input
                  type="text"
                  required
                  value={txnRef}
                  onChange={(e) => setTxnRef(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-semibold"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setActiveFarmerPayout(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md"
                >
                  Approve & Release Funds
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg glass-card ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span className="text-sm font-semibold">{toast.msg}</span>
        </div>
      )}
    </div>
  );
};
