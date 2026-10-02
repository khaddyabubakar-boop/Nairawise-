import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, BriefcaseBusiness, Check, ChevronLeft, ChevronRight,
  Coins, Lightbulb, Moon, Pencil, Plus, ShoppingBag, Sun, Trash2, TrendingDown,
  TrendingUp, Wallet, X,
} from 'lucide-react';

type Type = 'income' | 'expense';
type Transaction = {
  id: string;
  type: Type;
  amount: number;
  date: string;
  note: string;
  category: string;
};

const incomeSources = ['Salary', 'Side Hustle', 'Business', 'Gift', 'Other'];
const expenseCategories = ['Food', 'Transport', 'Data/Airtime', 'Rent', 'School Fees', 'Clothes', 'Health', 'Miscellaneous'];
const catColors: Record<string, string> = {
  Food: '#d49b46', Transport: '#5e9e8b', 'Data/Airtime': '#8195bd', Rent: '#b87b71',
  'School Fees': '#8879a9', Clothes: '#d07c8c', Health: '#70a66d', Miscellaneous: '#91a29b',
};
const STORE = 'nairawise.transactions.v1';
const THEME = 'nairawise.theme';
function getLocalDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readTransactions(): Transaction[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORE) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is Transaction =>
      !!item && typeof item.id === 'string' && (item.type === 'income' || item.type === 'expense') &&
      Number.isFinite(item.amount) && item.amount > 0 && typeof item.date === 'string' && typeof item.category === 'string'
    );
  } catch { return []; }
}

function formatNaira(amount: number, compact = false) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
    notation: compact && amount >= 1000000 ? 'compact' : 'standard',
  }).format(Math.round(Math.abs(amount)));
}

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>(readTransactions);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => localStorage.getItem(THEME) === 'dark' ? 'dark' : 'light');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [dialog, setDialog] = useState<'transaction' | 'delete' | 'clear' | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [target, setTarget] = useState<Transaction | null>(null);
  const [type, setType] = useState<Type>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getLocalDateValue);
  const [category, setCategory] = useState(expenseCategories[0]);
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    localStorage.setItem(STORE, JSON.stringify(transactions));
  }, [transactions]);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(THEME, theme);
  }, [theme]);
  useEffect(() => {
    if (!dialog) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeDialog();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog]);

  function closeDialog() {
    setDialog(null);
    setEditing(null);
    setTarget(null);
    setFormError('');
  }

  function openForm(selectedType: Type, transaction?: Transaction) {
    setEditing(transaction || null);
    setType(transaction?.type || selectedType);
    setAmount(transaction ? String(transaction.amount) : '');
    setDate(transaction?.date || getLocalDateValue());
    setCategory(transaction?.category || (selectedType === 'income' ? incomeSources[0] : expenseCategories[0]));
    setNote(transaction?.note || '');
    setFormError('');
    setDialog('transaction');
  }

  const monthItems = useMemo(() => transactions.filter((t) => {
    const d = new Date(`${t.date}T12:00:00`);
    return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
  }).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)), [transactions, month]);
  const income = monthItems.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expenses = monthItems.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const net = income - expenses;
  const categoryTotals = expenseCategories.map((name) => ({
    name,
    amount: monthItems.filter((t) => t.type === 'expense' && t.category === name).reduce((sum, t) => sum + t.amount, 0),
  })).filter((item) => item.amount > 0).sort((a, b) => b.amount - a.amount);
  const majorCategory = categoryTotals[0];
  const monthLabel = new Intl.DateTimeFormat('en-NG', { month: 'long', year: 'numeric' }).format(month);

  function saveTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount.replaceAll(',', ''));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError('Enter an amount greater than ₦0.');
      return;
    }
    if (!date) { setFormError('Choose a date for this transaction.'); return; }
    const validOptions = type === 'income' ? incomeSources : expenseCategories;
    if (!validOptions.includes(category)) { setFormError('Choose one option from the list.'); return; }
    const saved: Transaction = {
      id: editing?.id || (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`),
      type, amount: parsedAmount, date, note: note.trim(), category,
    };
    setTransactions((current) => editing ? current.map((item) => item.id === editing.id ? saved : item) : [saved, ...current]);
    closeDialog();
  }

  function confirmDelete() {
    if (target) setTransactions((current) => current.filter((item) => item.id !== target.id));
    closeDialog();
  }

  function changeType(next: Type) {
    setType(next);
    setCategory(next === 'income' ? incomeSources[0] : expenseCategories[0]);
  }

  const motivator = expenses === 0
    ? 'Add your everyday spending as it happens. A little clarity makes it easier to plan the rest of your month.'
    : net < 0
      ? `Your spending is higher than your income this month. ${majorCategory?.name === 'Food' ? 'Food' : majorCategory?.name === 'Data/Airtime' ? 'Data/Airtime' : majorCategory?.name} is your biggest expense—small changes there may help.`
      : majorCategory?.name === 'Food'
        ? `Food is your biggest expense at ${formatNaira(majorCategory.amount)}. A simple meal plan may help you spend with more ease.`
        : majorCategory?.name === 'Data/Airtime'
          ? `Data/Airtime is your biggest expense at ${formatNaira(majorCategory.amount)}. Checking your plan before the next renewal could help.`
          : `You have ${formatNaira(net)} left after this month's recorded spending. Keep noting your expenses to see where your money goes.`;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="NairaWise home">
          <div className="brand-mark" aria-hidden="true">₦</div>
          <div className="brand-name">Naira<span>Wise</span></div>
        </div>
        <div className="top-actions">
          <span className="eyebrow" style={{ margin: 0, letterSpacing: '.7px' }}>Your money, made clearer</span>
          <button className="icon-button" aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'} data-testid="button-theme-toggle" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      <main className="main">
        <section className="welcome">
          <div>
            <p className="eyebrow">A clearer view of your money</p>
            <h1>Your money, at a glance.</h1>
            <p>Every naira has a story. See yours, one month at a time.</p>
          </div>
          <div className="month-nav" aria-label="Choose a month">
            <button aria-label="Previous month" data-testid="button-previous-month" onClick={() => setMonth((old) => new Date(old.getFullYear(), old.getMonth() - 1, 1))}><ChevronLeft size={19} /></button>
            <span className="month-label" aria-live="polite" data-testid="text-selected-month">{monthLabel}</span>
            <button aria-label="Next month" data-testid="button-next-month" onClick={() => setMonth((old) => new Date(old.getFullYear(), old.getMonth() + 1, 1))}><ChevronRight size={19} /></button>
          </div>
        </section>

        <section className="summary-grid" aria-label={`${monthLabel} summary`}>
          <article className="summary-card">
            <div className="sum-label"><span className="sum-icon"><ArrowDownLeft size={16} /></span>Total income</div>
            <strong className="sum-amount" data-testid="text-month-income">{formatNaira(income)}</strong>
            <div className="sum-caption">Income recorded in {monthLabel}</div>
          </article>
          <article className="summary-card">
            <div className="sum-label"><span className="sum-icon" style={{ color: '#a87436', background: '#fbf1e5' }}><ArrowUpRight size={16} /></span>Total expenses</div>
            <strong className="sum-amount" data-testid="text-month-expenses">{formatNaira(expenses)}</strong>
            <div className="sum-caption">Spending recorded in {monthLabel}</div>
          </article>
          <article className={`summary-card total${net < 0 ? ' negative' : ''}`}>
            <div className="sum-label"><span className="sum-icon"><Wallet size={16} /></span>{net < 0 ? 'Balance to cover' : 'Current balance'}</div>
            <strong className="sum-amount" data-testid="text-month-balance">{net < 0 ? `−${formatNaira(net)}` : formatNaira(net)}</strong>
            <div className="sum-caption" aria-live="polite" data-testid="text-balance-status">{net < 0 ? 'You are overspending this period' : 'Income minus spending'}</div>
          </article>
        </section>

        <section className="content-grid">
          <article className="panel">
            <div className="panel-head">
              <div>
                <h2 className="panel-title">Your transactions</h2>
                <p className="panel-subtitle">{monthItems.length ? `${monthItems.length} ${monthItems.length === 1 ? 'entry' : 'entries'} in ${monthLabel}` : `What comes in and goes out in ${monthLabel}`}</p>
              </div>
              <button className="primary-button" data-testid="button-add-transaction" onClick={() => openForm('expense')}><Plus size={17} /> Add transaction</button>
            </div>
            {monthItems.length === 0 ? (
              <div className="empty" data-testid="empty-transactions">
                <div className="empty-mark"><Coins size={25} /></div>
                <h3>A fresh month, a fresh start.</h3>
                <p>No transactions recorded for {monthLabel}. Add income or spending to begin seeing your money clearly.</p>
                <div className="empty-actions">
                  <button className="secondary-button" onClick={() => openForm('income')} data-testid="button-empty-income"><ArrowDownLeft size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />Add income</button>
                  <button className="secondary-button" onClick={() => openForm('expense')} data-testid="button-empty-expense"><ArrowUpRight size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />Add spending</button>
                </div>
              </div>
            ) : (
              <div className="transaction-list" data-testid="list-transactions">
                {monthItems.map((item) => (
                  <div className={`transaction ${item.type}`} key={item.id} data-testid={`row-transaction-${item.id}`}>
                    <div className="transaction-icon">{item.type === 'income' ? <TrendingUp size={19} /> : <ShoppingBag size={18} />}</div>
                    <div className="transaction-info">
                      <div className="transaction-name">{item.note || item.category}</div>
                      <div className="transaction-meta">{new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short' }).format(new Date(`${item.date}T12:00:00`))} · {item.category}</div>
                    </div>
                    <div className="transaction-side">
                      <strong className={`transaction-amount ${item.type}`} data-testid={`text-transaction-amount-${item.id}`}>{item.type === 'income' ? '+' : '−'}{formatNaira(item.amount)}</strong>
                      <div className="transaction-tools">
                        <button aria-label={`Edit ${item.note || item.category}`} title="Edit transaction" data-testid={`button-edit-${item.id}`} onClick={() => openForm(item.type, item)}><Pencil size={15} /></button>
                        <button aria-label={`Delete ${item.note || item.category}`} title="Delete transaction" data-testid={`button-delete-${item.id}`} onClick={() => { setTarget(item); setDialog('delete'); }}><Trash2 size={15} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <aside className="panel">
            <div className="panel-head">
              <div>
                <h2 className="panel-title">Where it went</h2>
                <p className="panel-subtitle">Spending by category</p>
              </div>
              <span className="sum-icon" style={{ width: 36, height: 36 }}><BriefcaseBusiness size={17} /></span>
            </div>
            {categoryTotals.length ? (
              <div className="breakdown-body" data-testid="list-category-breakdown">
                {categoryTotals.map((item) => {
                  const percent = expenses ? item.amount / expenses * 100 : 0;
                  return <div className="category-row" key={item.name} data-testid={`row-category-${item.name.toLowerCase().replaceAll(/[^a-z]+/g, '-')}`}>
                    <div className="category-head">
                      <span className="category-title"><i className="category-dot" style={{ '--cat-color': catColors[item.name] } as React.CSSProperties} />{item.name}</span>
                      <span className="category-numbers">{formatNaira(item.amount)} · {Math.round(percent)}%</span>
                    </div>
                    <div className="progress-track" role="progressbar" aria-label={`${item.name} share of spending`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
                      <div className="progress-fill" style={{ '--cat-color': catColors[item.name], transform: `scaleX(${percent / 100})` } as React.CSSProperties} />
                    </div>
                  </div>;
                })}
              </div>
            ) : (
              <div className="empty" style={{ borderTop: 0, paddingTop: 9, paddingBottom: 17 }} data-testid="empty-breakdown">
                <p style={{ marginBottom: 0 }}>Your spending breakdown will appear here when you add an expense.</p>
              </div>
            )}
            <div className="tip" data-testid="text-spending-tip">
              <span className="tip-bulb"><Lightbulb size={17} /></span>
              <div><strong>A small thought</strong><p>{motivator}</p></div>
            </div>
          </aside>
        </section>

        <div className="bottom-row">
          <button className="clear-button" data-testid="button-clear-all" onClick={() => setDialog('clear')}><Trash2 size={14} /> Clear all data</button>
        </div>
      </main>

      {dialog === 'transaction' && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) closeDialog(); }}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="transaction-dialog-title">
            <div className="modal-header">
              <div><h2 id="transaction-dialog-title">{editing ? 'Edit transaction' : 'Add a transaction'}</h2><p>Keep it simple. You can change this later.</p></div>
              <button className="close-button" aria-label="Close dialog" onClick={closeDialog}><X size={18} /></button>
            </div>
            <form onSubmit={saveTransaction} noValidate>
              <div className="type-switch" aria-label="Transaction type">
                <button type="button" aria-pressed={type === 'expense'} onClick={() => changeType('expense')} data-testid="button-type-expense"><TrendingDown size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />Money out</button>
                <button type="button" aria-pressed={type === 'income'} onClick={() => changeType('income')} data-testid="button-type-income"><TrendingUp size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />Money in</button>
              </div>
              <div className="field">
                <label htmlFor="transaction-amount">Amount</label>
                <div className="amount-field"><span>₦</span><input id="transaction-amount" type="number" inputMode="decimal" min="1" step="any" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus data-testid="input-transaction-amount" /></div>
              </div>
              <div className="field">
                <label htmlFor="transaction-category">{type === 'income' ? 'Where did it come from?' : 'What was it for?'}</label>
                <select id="transaction-category" value={category} onChange={(e) => setCategory(e.target.value)} data-testid="select-transaction-category">
                  {(type === 'income' ? incomeSources : expenseCategories).map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="transaction-date">Date</label>
                <input id="transaction-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-transaction-date" />
              </div>
              <div className="field">
                <label htmlFor="transaction-note">Note <span style={{ color: 'hsl(var(--muted-foreground))', fontWeight: 400 }}>(optional)</span></label>
                <input id="transaction-note" type="text" maxLength={70} placeholder={type === 'income' ? 'For example, monthly pay' : 'For example, lunch with friends'} value={note} onChange={(e) => setNote(e.target.value)} data-testid="input-transaction-note" />
              </div>
              {formError && <p role="alert" style={{ color: 'hsl(var(--destructive))', fontSize: 13, margin: '0 0 12px' }}>{formError}</p>}
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={closeDialog}>Cancel</button>
                <button type="submit" className="primary-button" data-testid="button-save-transaction"><Check size={16} />{editing ? 'Save changes' : 'Save transaction'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {dialog === 'delete' && target && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) closeDialog(); }}>
          <section className="modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title">
            <div className="modal-header"><div><h2 id="delete-dialog-title">Delete this transaction?</h2><p>This transaction will be removed from your records.</p></div><button className="close-button" aria-label="Close dialog" onClick={closeDialog}><X size={18} /></button></div>
            <div className="warning-box">{target.note || target.category} · {formatNaira(target.amount)}<br />This can't be undone.</div>
            <div className="modal-actions"><button className="secondary-button" onClick={closeDialog}>Keep it</button><button className="danger-button" data-testid="button-confirm-delete" onClick={confirmDelete}>Delete transaction</button></div>
          </section>
        </div>
      )}

      {dialog === 'clear' && (
        <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) closeDialog(); }}>
          <section className="modal" role="alertdialog" aria-modal="true" aria-labelledby="clear-dialog-title">
            <div className="modal-header"><div><h2 id="clear-dialog-title">Clear all saved data?</h2><p>This will remove every transaction saved on this device.</p></div><button className="close-button" aria-label="Close dialog" onClick={closeDialog}><X size={18} /></button></div>
            <div className="warning-box"><strong>Warning: this is permanent.</strong><br />All saved transactions on this device will be permanently deleted. This cannot be undone.</div>
            <div className="modal-actions"><button className="secondary-button" onClick={closeDialog}>Keep my data</button><button className="danger-button" data-testid="button-confirm-clear-all" onClick={() => { setTransactions([]); closeDialog(); }}>Permanently delete all</button></div>
          </section>
        </div>
      )}
      <footer style={{ textAlign: 'center', color: 'hsl(var(--muted-foreground))', fontSize: 11, padding: '0 16px 24px' }}>Your financial details stay on this device.</footer>
    </div>
  );
}

export default App;