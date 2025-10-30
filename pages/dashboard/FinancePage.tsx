import React, { useState, useMemo, useEffect } from 'react';
import Header from '../../components/Header';
import { useData } from '../../context/DataContext';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import Input from '../../components/Input';
import { Invoice, Expense } from '../../types';
import { PlusCircle, Edit, Trash2, ChevronsRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

// Helper function to format date for display
const formatDateForDisplay = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
};


const ReplicateItemsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onReplicate: (items: (Invoice | Expense)[]) => void;
  lastMonthInvoices: Invoice[];
  lastMonthExpenses: Expense[];
}> = ({ isOpen, onClose, onReplicate, lastMonthInvoices, lastMonthExpenses }) => {
    const [selectedItems, setSelectedItems] = useState<(Invoice | Expense)[]>([]);

    useEffect(() => {
        if (isOpen) {
            // Pre-select all items by default when modal opens
            setSelectedItems([...lastMonthInvoices, ...lastMonthExpenses]);
        } else {
            setSelectedItems([]);
        }
    }, [isOpen, lastMonthInvoices, lastMonthExpenses]);


    const handleToggleItem = (item: Invoice | Expense) => {
        setSelectedItems(prev => 
            prev.some(i => i.id === item.id) ? prev.filter(i => i.id !== item.id) : [...prev, item]
        );
    };

    const handleReplicateClick = () => {
        onReplicate(selectedItems);
        onClose();
    };
    
    const hasItems = lastMonthInvoices.length > 0 || lastMonthExpenses.length > 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Replicar Itens do Mês Anterior">
            {hasItems ? (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Faturas</h3>
                        {lastMonthInvoices.length > 0 ? (
                            <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                {lastMonthInvoices.map(inv => (
                                    <li key={`inv-${inv.id}`} className="flex items-center bg-white/5 p-2 rounded-md">
                                        <input type="checkbox" id={`inv-${inv.id}`} checked={selectedItems.some(i => i.id === inv.id)} onChange={() => handleToggleItem(inv)} className="h-4 w-4 rounded bg-white/10 border-white/20 text-[var(--btn-grad-from)] focus:ring-[var(--btn-grad-to)] mr-3" />
                                        <label htmlFor={`inv-${inv.id}`} className="flex-grow">{inv.nome_cliente} - R$ {inv.amount.toFixed(2)}</label>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-gray-500 text-sm">Nenhuma fatura encontrada no mês anterior.</p>}
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Despesas</h3>
                        {lastMonthExpenses.length > 0 ? (
                            <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                {lastMonthExpenses.map(exp => (
                                    <li key={`exp-${exp.id}`} className="flex items-center bg-white/5 p-2 rounded-md">
                                        <input type="checkbox" id={`exp-${exp.id}`} checked={selectedItems.some(i => i.id === exp.id)} onChange={() => handleToggleItem(exp)} className="h-4 w-4 rounded bg-white/10 border-white/20 text-[var(--btn-grad-from)] focus:ring-[var(--btn-grad-to)] mr-3" />
                                        <label htmlFor={`exp-${exp.id}`} className="flex-grow">{exp.description} - R$ {exp.amount.toFixed(2)}</label>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-gray-500 text-sm">Nenhuma despesa encontrada no mês anterior.</p>}
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button onClick={handleReplicateClick} disabled={selectedItems.length === 0}>
                            Replicar {selectedItems.length} {selectedItems.length === 1 ? 'Item' : 'Itens'}
                        </Button>
                    </div>
                </div>
            ) : (
                <p className="text-gray-400 text-center py-8">Não há faturas ou despesas no mês anterior para replicar.</p>
            )}
        </Modal>
    );
};


const FinancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'expenses'>('invoices');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { 
    invoices, 
    expenses, 
    addInvoice,
    updateInvoice,
    deleteInvoice,
    addExpense,
    updateExpense,
    deleteExpense,
  } = useData();
  const { addToast } = useToast();

  const [isInvoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);
  const [isReplicateModalOpen, setReplicateModalOpen] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Partial<Invoice> | null>(null);
  const [currentExpense, setCurrentExpense] = useState<Partial<Expense> | null>(null);

  const goToPreviousMonth = () => setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 15));
  const goToNextMonth = () => setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 15));

  const { monthlyInvoices, monthlyExpenses } = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    
    const filteredInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.data_vencimento);
        return invDate.getFullYear() === year && invDate.getMonth() === month;
    });

    const filteredExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getFullYear() === year && expDate.getMonth() === month;
    });
    
    return { monthlyInvoices: filteredInvoices, monthlyExpenses: filteredExpenses };
  }, [invoices, expenses, selectedDate]);
  
  const summary = useMemo(() => {
    const revenue = monthlyInvoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.amount, 0);
    const totalExpenses = monthlyExpenses.reduce((acc, e) => acc + e.amount, 0);
    const balance = revenue - totalExpenses;
    return { revenue, totalExpenses, balance };
  }, [monthlyInvoices, monthlyExpenses]);
  
  const lastMonthItems = useMemo(() => {
    const lastMonthDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 15);
    const lastMonthYear = lastMonthDate.getFullYear();
    const lastMonth = lastMonthDate.getMonth();

    const lastMonthInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.data_vencimento);
        return invDate.getFullYear() === lastMonthYear && invDate.getMonth() === lastMonth;
    });
    const lastMonthExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getFullYear() === lastMonthYear && expDate.getMonth() === lastMonth;
    });
    return { lastMonthInvoices, lastMonthExpenses };
  }, [invoices, expenses, selectedDate]);
  
  const handleOpenInvoiceModal = (invoice: Partial<Invoice> | null = null) => {
    setCurrentInvoice(invoice || {});
    setInvoiceModalOpen(true);
  };
  
  const handleOpenExpenseModal = (expense: Partial<Expense> | null = null) => {
    setCurrentExpense(expense || {});
    setExpenseModalOpen(true);
  };

  const handleSaveInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentInvoice) return;
    const data = {
        nome_cliente: currentInvoice.nome_cliente!,
        amount: Number(currentInvoice.amount) || 0,
        status: currentInvoice.status || 'pending',
        data_vencimento: currentInvoice.data_vencimento ? new Date(currentInvoice.data_vencimento) : new Date(),
    };
    if (currentInvoice.id) {
        await updateInvoice(currentInvoice.id, data);
        addToast("Fatura atualizada com sucesso!", "success");
    } else {
        await addInvoice(data);
        addToast("Fatura criada com sucesso!", "success");
    }
    setInvoiceModalOpen(false);
    setCurrentInvoice(null);
  };
  
  const handleSaveExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentExpense) return;
    const data = {
        description: currentExpense.description!,
        amount: Number(currentExpense.amount) || 0,
        category: currentExpense.category || 'Geral',
        date: currentExpense.date ? new Date(currentExpense.date) : new Date(),
    };
    if (currentExpense.id) {
        await updateExpense(currentExpense.id, data);
        addToast("Despesa atualizada com sucesso!", "success");
    } else {
        await addExpense(data);
        addToast("Despesa criada com sucesso!", "success");
    }
    setExpenseModalOpen(false);
    setCurrentExpense(null);
  };

  const handleDeleteInvoice = async (id: number) => {
    if(window.confirm('Tem certeza que deseja deletar esta fatura?')) {
        await deleteInvoice(id);
        addToast("Fatura deletada.", "success");
    }
  }

  const handleDeleteExpense = async (id: number) => {
    if(window.confirm('Tem certeza que deseja deletar esta despesa?')) {
        await deleteExpense(id);
        addToast("Despesa deletada.", "success");
    }
  }
  
  const handleReplicate = async (itemsToReplicate: (Invoice | Expense)[]) => {
      let successCount = 0;
      for (const item of itemsToReplicate) {
          try {
              if ('nome_cliente' in item) { // It's an Invoice
                  const newDueDate = new Date(item.data_vencimento);
                  newDueDate.setMonth(newDueDate.getMonth() + 1);
                  await addInvoice({
                      nome_cliente: item.nome_cliente,
                      amount: item.amount,
                      status: 'pending',
                      data_vencimento: newDueDate,
                  });
              } else { // It's an Expense
                  const newDate = new Date(item.date);
                  newDate.setMonth(newDate.getMonth() + 1);
                  await addExpense({
                      description: item.description,
                      amount: item.amount,
                      category: item.category,
                      date: newDate,
                  });
              }
              successCount++;
          } catch(error) {
              addToast(`Falha ao replicar o item: ${(error as Error).message}`, 'error');
          }
      }
      if (successCount > 0) {
        addToast(`${successCount} item(ns) replicado(s) com sucesso para este mês!`, 'success');
      }
  };


  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <div className="flex items-center gap-2 sm:gap-4 p-2 glass-panel rounded-full">
                <Button onClick={goToPreviousMonth} variant="ghost" size="sm" className="rounded-full !px-3"><ChevronLeft/></Button>
                <h2 className="text-xl font-semibold text-white capitalize w-48 text-center">{formatDateForDisplay(selectedDate)}</h2>
                <Button onClick={goToNextMonth} variant="ghost" size="sm" className="rounded-full !px-3"><ChevronRight/></Button>
            </div>
            <Button variant="secondary" onClick={() => setReplicateModalOpen(true)}>
                <ChevronsRight size={16} className="mr-2"/> Replicar Mês Anterior
            </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="glass-panel p-6 rounded-lg">
                <h3 className="text-gray-400 text-sm">Receita (Pago)</h3>
                <p className="text-3xl font-bold text-[var(--btn-grad-from)]">R$ {summary.revenue.toFixed(2)}</p>
            </div>
            <div className="glass-panel p-6 rounded-lg">
                <h3 className="text-gray-400 text-sm">Despesas</h3>
                <p className="text-3xl font-bold text-red-500">R$ {summary.totalExpenses.toFixed(2)}</p>
            </div>
            <div className="glass-panel p-6 rounded-lg">
                <h3 className="text-gray-400 text-sm">Saldo</h3>
                <p className={`text-3xl font-bold ${summary.balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>R$ {summary.balance.toFixed(2)}</p>
            </div>
        </div>

        <div className="flex border-b border-white/10 mb-6">
            <button onClick={() => setActiveTab('invoices')} className={`py-2 px-4 text-lg ${activeTab === 'invoices' ? 'text-[var(--btn-grad-from)] border-b-2 border-[var(--btn-grad-from)]' : 'text-gray-400'}`}>Faturas ({monthlyInvoices.length})</button>
            <button onClick={() => setActiveTab('expenses')} className={`py-2 px-4 text-lg ${activeTab === 'expenses' ? 'text-[var(--btn-grad-from)] border-b-2 border-[var(--btn-grad-from)]' : 'text-gray-400'}`}>Despesas ({monthlyExpenses.length})</button>
        </div>

        <div className="glass-panel p-6 rounded-lg">
            {activeTab === 'invoices' && (
                <div>
                    <div className="flex justify-end mb-4">
                        <Button onClick={() => handleOpenInvoiceModal()}><PlusCircle className="mr-2" size={20}/>Nova Fatura</Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                           <thead className="border-b border-white/10">
                                <tr>
                                    <th className="p-4">Cliente</th>
                                    <th className="p-4">Valor</th>
                                    <th className="p-4">Vencimento</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyInvoices.length > 0 ? monthlyInvoices.map(invoice => (
                                    <tr key={invoice.id} className="border-b border-white/10 last:border-b-0">
                                        <td className="p-4">{invoice.nome_cliente}</td>
                                        <td className="p-4">R$ {invoice.amount.toFixed(2)}</td>
                                        <td className="p-4">{new Date(invoice.data_vencimento).toLocaleDateString()}</td>
                                        <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs ${invoice.status === 'paid' ? 'bg-green-500/20 text-green-400' : invoice.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{invoice.status}</span></td>
                                        <td className="p-4 flex space-x-2">
                                            <button onClick={() => handleOpenInvoiceModal(invoice)} className="text-blue-400 hover:text-blue-300"><Edit size={18}/></button>
                                            <button onClick={() => handleDeleteInvoice(invoice.id)} className="text-red-400 hover:text-red-300"><Trash2 size={18}/></button>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan={5} className="text-center p-8 text-gray-500">Nenhuma fatura para {formatDateForDisplay(selectedDate)}.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {activeTab === 'expenses' && (
                <div>
                    <div className="flex justify-end mb-4">
                        <Button onClick={() => handleOpenExpenseModal()}><PlusCircle className="mr-2" size={20}/>Nova Despesa</Button>
                    </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left">
                           <thead className="border-b border-white/10">
                                <tr>
                                    <th className="p-4">Descrição</th>
                                    <th className="p-4">Valor</th>
                                    <th className="p-4">Categoria</th>
                                    <th className="p-4">Data</th>
                                    <th className="p-4">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyExpenses.length > 0 ? monthlyExpenses.map(expense => (
                                    <tr key={expense.id} className="border-b border-white/10 last:border-b-0">
                                        <td className="p-4">{expense.description}</td>
                                        <td className="p-4">R$ {expense.amount.toFixed(2)}</td>
                                        <td className="p-4">{expense.category}</td>
                                        <td className="p-4">{new Date(expense.date).toLocaleDateString()}</td>
                                        <td className="p-4 flex space-x-2">
                                            <button onClick={() => handleOpenExpenseModal(expense)} className="text-blue-400 hover:text-blue-300"><Edit size={18}/></button>
                                            <button onClick={() => handleDeleteExpense(expense.id)} className="text-red-400 hover:text-red-300"><Trash2 size={18}/></button>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan={5} className="text-center p-8 text-gray-500">Nenhuma despesa para {formatDateForDisplay(selectedDate)}.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      </div>
      
      <Modal isOpen={isInvoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} title={currentInvoice?.id ? 'Editar Fatura' : 'Nova Fatura'}>
          <form onSubmit={handleSaveInvoice} className="space-y-4">
              <Input label="Nome do Cliente" type="text" value={currentInvoice?.nome_cliente || ''} onChange={e => setCurrentInvoice({...currentInvoice, nome_cliente: e.target.value})} required/>
              <Input label="Valor" type="number" step="0.01" value={currentInvoice?.amount || ''} onChange={e => setCurrentInvoice({...currentInvoice, amount: Number(e.target.value)})} required/>
              <Input label="Data de Vencimento" type="date" value={currentInvoice?.data_vencimento ? new Date(currentInvoice.data_vencimento).toISOString().split('T')[0] : ''} onChange={e => setCurrentInvoice({...currentInvoice, data_vencimento: e.target.value})} required/>
              <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                  <select value={currentInvoice?.status || 'pending'} onChange={e => setCurrentInvoice({...currentInvoice, status: e.target.value as 'paid' | 'pending' | 'overdue'})} className="w-full bg-white/5 border border-white/10 text-white rounded-md p-2">
                      <option value="pending">Pendente</option>
                      <option value="paid">Pago</option>
                      <option value="overdue">Vencida</option>
                  </select>
              </div>
              <div className="flex justify-end pt-4">
                  <Button type="submit">Salvar Fatura</Button>
              </div>
          </form>
      </Modal>

      <Modal isOpen={isExpenseModalOpen} onClose={() => setExpenseModalOpen(false)} title={currentExpense?.id ? 'Editar Despesa' : 'Nova Despesa'}>
          <form onSubmit={handleSaveExpense} className="space-y-4">
              <Input label="Descrição" type="text" value={currentExpense?.description || ''} onChange={e => setCurrentExpense({...currentExpense, description: e.target.value})} required/>
              <Input label="Valor" type="number" step="0.01" value={currentExpense?.amount || ''} onChange={e => setCurrentExpense({...currentExpense, amount: Number(e.target.value)})} required/>
              <Input label="Categoria" type="text" value={currentExpense?.category || ''} onChange={e => setCurrentExpense({...currentExpense, category: e.target.value})} required/>
              <Input label="Data" type="date" value={currentExpense?.date ? new Date(currentExpense.date).toISOString().split('T')[0] : ''} onChange={e => setCurrentExpense({...currentExpense, date: e.target.value})} required/>
              <div className="flex justify-end pt-4">
                  <Button type="submit">Salvar Despesa</Button>
              </div>
          </form>
      </Modal>

      <ReplicateItemsModal 
        isOpen={isReplicateModalOpen}
        onClose={() => setReplicateModalOpen(false)}
        onReplicate={handleReplicate}
        lastMonthInvoices={lastMonthItems.lastMonthInvoices}
        lastMonthExpenses={lastMonthItems.lastMonthExpenses}
      />
    </div>
  );
};

export default FinancePage;