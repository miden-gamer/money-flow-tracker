'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [denominations, setDenominations] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Transaction Form State
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txType, setTxType] = useState('EXPENSE');
  const [txAmount, setTxAmount] = useState('');
  const [txFrom, setTxFrom] = useState('');
  const [txTo, setTxTo] = useState('');
  const [txTarget, setTxTarget] = useState('');
  const [txTags, setTxTags] = useState('');
  const [txNotes, setTxNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: accData } = await supabase.from('accounts').select('*');
    const { data: txData } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    const { data: denData } = await supabase.from('cash_denominations').select('*').order('denomination', { ascending: false });

    if (accData) setAccounts(accData);
    if (txData) setTransactions(txData);
    if (denData) setDenominations(denData);
    setLoading(false);
  }

  // Calculate live account balances dynamically from transaction ledger
  function calculateAccountBalances() {
    return accounts.map((acc) => {
      const inflow = transactions
        .filter((t) => t.to_account_id === acc.id)
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const outflow = transactions
        .filter((t) => t.from_account_id === acc.id)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const balance = Number(acc.starting_balance) + inflow - outflow;
      return { ...acc, inflow, outflow, balance };
    });
  }

  const calculatedAccounts = calculateAccountBalances();
  const totalNetWorth = calculatedAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  // Physical Cash Audit Calculation
  const totalPhysicalCash = denominations.reduce((sum, d) => sum + Number(d.denomination) * d.count, 0);
  const cashWalletAccount = calculatedAccounts.find((a) => a.name === 'Cash Wallet');
  const expectedCash = cashWalletAccount ? cashWalletAccount.balance : 0;
  const cashVariance = totalPhysicalCash - expectedCash;

  async function handleAddTransaction(e) {
    e.preventDefault();
    if (!txAmount || Number(txAmount) <= 0) return alert('Enter a valid amount');

    const newTx = {
      date: txDate,
      type: txType,
      amount: parseFloat(txAmount),
      from_account_id: txType === 'INCOME' ? null : txFrom || null,
      to_account_id: txType === 'EXPENSE' ? null : txTo || null,
      category_or_target: txTarget || (txType === 'TRANSFER' ? 'Transfer' : 'General'),
      tags_person: txTags,
      notes: txNotes,
    };

    const { error } = await supabase.from('transactions').insert([newTx]);
    if (error) {
      alert('Error adding transaction: ' + error.message);
    } else {
      setTxAmount('');
      setTxTarget('');
      setTxTags('');
      setTxNotes('');
      fetchData();
    }
  }

  async function updateDenominationCount(id, count) {
    const newCount = Math.max(0, parseInt(count) || 0);
    setDenominations(denominations.map(d => d.id === id ? { ...d, count: newCount } : d));
    await supabase.from('cash_denominations').update({ count: newCount }).eq('id', id);
  }

  if (loading) {
    return <div className="p-8 text-center text-emerald-400 font-mono">Loading Money Flow Tracker...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      {/* Top Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-400">Money Flow Tracker</h1>
          <p className="text-xs text-slate-400">Double-Entry Multi-Account Wealth Engine</p>
        </div>
        <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
          <span className="text-xs text-slate-400 uppercase tracking-wider block">Total Net Worth</span>
          <span className="text-xl font-bold text-emerald-400">₹{totalNetWorth.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex gap-2 border-b border-slate-800 pb-2">
        {['dashboard', 'transactions', 'cash-audit'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </nav>

      {/* TAB 1: ACCOUNTS DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {calculatedAccounts.map((acc) => (
              <div key={acc.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-slate-300">{acc.name}</span>
                  <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-300">{acc.type}</span>
                </div>
                <div className="text-xl font-bold text-slate-100">
                  ₹{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-400 flex justify-between pt-2 border-t border-slate-700/30">
                  <span>In: ₹{acc.inflow.toFixed(2)}</span>
                  <span>Out: ₹{acc.outflow.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Live Account Ledger Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800 text-slate-400">
                  <tr>
                    <th className="p-2">Account Name</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Inflow (₹)</th>
                    <th className="p-2">Outflow (₹)</th>
                    <th className="p-2 text-right">Current Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {calculatedAccounts.map((acc) => (
                    <tr key={acc.id}>
                      <td className="p-2 font-medium">{acc.name}</td>
                      <td className="p-2 text-slate-400">{acc.type}</td>
                      <td className="p-2 text-emerald-400">+{acc.inflow.toFixed(2)}</td>
                      <td className="p-2 text-rose-400">-{acc.outflow.toFixed(2)}</td>
                      <td className="p-2 text-right font-bold">₹{acc.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTIONS LEDGER */}
      {activeTab === 'transactions' && (
        <div className="space-y-6">
          {/* Add Transaction Form */}
          <form onSubmit={handleAddTransaction} className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Date</label>
              <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200" required />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Type</label>
              <select value={txType} onChange={(e) => setTxType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200">
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
                <option value="TRANSFER">Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Amount (₹)</label>
              <input type="number" step="0.01" placeholder="0.00" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200" required />
            </div>

            {txType !== 'INCOME' && (
              <div>
                <label className="block text-slate-400 mb-1">From Account</label>
                <select value={txFrom} onChange={(e) => setTxFrom(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200" required>
                  <option value="">Select Source</option>
                  {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
                </select>
              </div>
            )}

            {txType !== 'EXPENSE' && (
              <div>
                <label className="block text-slate-400 mb-1">To Account</label>
                <select value={txTo} onChange={(e) => setTxTo(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200" required>
                  <option value="">Select Target Account</option>
                  {accounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-slate-400 mb-1">Category / Person</label>
              <input type="text" placeholder="e.g., Snacks, Nani, PhonePe" value={txTarget} onChange={(e) => setTxTarget(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200" />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Tags</label>
              <input type="text" placeholder="Self, SIP, ATM" value={txTags} onChange={(e) => setTxTags(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200" />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Notes</label>
              <input type="text" placeholder="Details..." value={txNotes} onChange={(e) => setTxNotes(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200" />
            </div>

            <div className="md:col-span-4 flex justify-end">
              <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-6 py-2 rounded-lg transition-colors">
                Log Transaction
              </button>
            </div>
          </form>

          {/* Transactions Log Table */}
          <div className="bg-slate-800/30 border border-slate-800 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800 text-slate-400">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">From</th>
                  <th className="p-3">To / Category</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Tag/Person</th>
                  <th className="p-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {transactions.map((tx) => {
                  const fromAcc = accounts.find((a) => a.id === tx.from_account_id)?.name || 'External / Income';
                  const toAcc = accounts.find((a) => a.id === tx.to_account_id)?.name || tx.category_or_target;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono">{tx.date}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-400' :
                          tx.type === 'EXPENSE' ? 'bg-rose-500/10 text-rose-400' : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300">{fromAcc}</td>
                      <td className="p-3 text-slate-300">{toAcc}</td>
                      <td className="p-3 font-bold font-mono">₹{Number(tx.amount).toFixed(2)}</td>
                      <td className="p-3 text-slate-400">{tx.tags_person || '-'}</td>
                      <td className="p-3 text-slate-400">{tx.notes || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PHYSICAL CASH AUDIT */}
      {activeTab === 'cash-audit' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-slate-800/30 border border-slate-800 rounded-xl p-4 space-y-4">
            <h2 className="text-sm font-semibold text-slate-300">Physical Cash Counter Grid</h2>
            <div className="grid grid-cols-1 gap-2">
              {denominations.map((d) => (
                <div key={d.id} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700/40">
                  <span className="text-sm font-medium w-28">{d.label}</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={d.count}
                      onChange={(e) => updateDenominationCount(d.id, e.target.value)}
                      className="w-20 bg-slate-900 border border-slate-700 rounded p-1 text-center text-sm font-bold text-emerald-400"
                    />
                    <span className="text-xs text-slate-400 w-24 text-right font-mono">
                      ₹{(Number(d.denomination) * d.count).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/30 border border-slate-800 rounded-xl p-4 space-y-4 h-fit">
            <h2 className="text-sm font-semibold text-slate-300">Reconciliation Audit</h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-2 bg-slate-800/60 rounded">
                <span className="text-slate-400">Total Physical Cash:</span>
                <span className="font-bold text-slate-100">₹{totalPhysicalCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between p-2 bg-slate-800/60 rounded">
                <span className="text-slate-400">Expected (Ledger):</span>
                <span className="font-bold text-slate-100">₹{expectedCash.toFixed(2)}</span>
              </div>
              <div className={`flex justify-between p-2 rounded font-bold ${
                cashVariance === 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}>
                <span>Variance / Discrepancy:</span>
                <span>₹{cashVariance.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}