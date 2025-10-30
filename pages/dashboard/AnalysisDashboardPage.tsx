import React, { useMemo } from 'react';
import Header from '../../components/Header';
import { useData } from '../../context/DataContext';
import { Project, Invoice, ProjectStatus } from '../../types';
import { ArrowUp, ArrowDown, Clock, AlertTriangle, CheckCircle, BarChart, Users, DollarSign, Hourglass, Settings2, Check, TrendingUp } from 'lucide-react';
import Spinner from '../../components/Spinner';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  comparison?: number;
  unit?: string;
  description?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, comparison, unit, description }) => {
  const ComparisonIndicator = () => {
    if (comparison === undefined) return null;
    const isPositive = comparison >= 0;
    return (
      <div className={`flex items-center text-xs font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? <ArrowUp size={12} className="mr-1" /> : <ArrowDown size={12} className="mr-1" />}
        {Math.abs(comparison).toFixed(1)}% vs. mês passado
      </div>
    );
  };

  return (
    <div className="glass-panel p-6 rounded-2xl hover:border-white/20 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">{title}</h3>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div className="flex items-baseline space-x-2">
         <p className="text-4xl font-bold text-white">{value}</p>
         {unit && <span className="text-lg text-gray-400">{unit}</span>}
      </div>
      {comparison !== undefined ? <ComparisonIndicator /> : <p className="text-xs text-gray-500 mt-1 h-4">{description || ''}</p>}
    </div>
  );
};

const AnalysisDashboardPage: React.FC = () => {
  const { projects, invoices, loading } = useData();

  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const riskDate = new Date();
    riskDate.setDate(today.getDate() + 5);

    const activeProjects = projects.filter(p => p.status !== ProjectStatus.Posted);

    const overdue = activeProjects.filter(p => p.data_entrega && new Date(p.data_entrega) < today);
    const atRisk = activeProjects.filter(p => p.data_entrega && new Date(p.data_entrega) >= today && new Date(p.data_entrega) <= riskDate);
    const onTrack = activeProjects.filter(p => !overdue.includes(p) && !atRisk.includes(p));

    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevMonthYear = prevMonthDate.getFullYear();

    const currentMonthRevenue = invoices
      .filter(i => {
        const createdAt = new Date(i.created_at);
        return i.status === 'paid' && createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear;
      })
      .reduce((sum, i) => sum + i.amount, 0);

    const prevMonthRevenue = invoices
      .filter(i => {
        const createdAt = new Date(i.created_at);
        return i.status === 'paid' && createdAt.getMonth() === prevMonth && createdAt.getFullYear() === prevMonthYear;
      })
      .reduce((sum, i) => sum + i.amount, 0);
      
    const revenueGrowth = prevMonthRevenue > 0 ? ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : currentMonthRevenue > 0 ? 100 : 0;
    
    const projectsCompletedThisMonth = projects.filter(p => {
        const completedAt = p.data_conclusao ? new Date(p.data_conclusao) : null;
        return p.status === ProjectStatus.Posted && completedAt && completedAt.getMonth() === currentMonth && completedAt.getFullYear() === currentYear;
    }).length;

    const inApproval = projects.filter(p => p.status === ProjectStatus.Approval).length;
    const inAdjustments = projects.filter(p => p.status === ProjectStatus.Adjustments).length;

    return {
      risk: { overdue: overdue.length, atRisk: atRisk.length, onTrack: onTrack.length },
      revenue: { current: currentMonthRevenue, previous: prevMonthRevenue, growth: revenueGrowth },
      deliveries: { completed: projectsCompletedThisMonth },
      clientActivity: { inApproval, inAdjustments, avgApprovalTime: "2.1 dias" } // avgApprovalTime is mocked
    };
  }, [projects, invoices]);

  if (loading) {
      return (
          <div className="flex flex-col h-screen">
              <Header />
              <div className="flex-1 flex items-center justify-center"><Spinner /></div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Dashboard de Análise</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Faturamento Mensal" value={`R$ ${metrics.revenue.current.toFixed(2)}`} icon={DollarSign} color="text-[var(--btn-grad-from)]" comparison={metrics.revenue.growth} />
            <StatCard title="Faturamento Mês Anterior" value={`R$ ${metrics.revenue.previous.toFixed(2)}`} icon={TrendingUp} color="text-gray-400" description="Receita do último mês"/>
            <StatCard title="Projetos Concluídos" value={metrics.deliveries.completed} icon={CheckCircle} color="text-blue-400" description="Neste mês"/>
            <StatCard title="Em Aprovação" value={metrics.clientActivity.inApproval} icon={Hourglass} color="text-yellow-400" description="Aguardando cliente"/>
        </div>

        <div className="mt-8 glass-panel rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center"><BarChart size={20} className="mr-3 text-[var(--btn-grad-from)]" /> Análise de Prazos e Riscos</h2>
            <div className="flex flex-col md:flex-row items-center justify-around gap-6">
                <div className="flex items-center gap-4 p-4 rounded-lg w-full md:w-auto">
                    <div className="bg-green-500/10 p-4 rounded-full"><Check className="h-8 w-8 text-green-400"/></div>
                    <div>
                        <p className="text-3xl font-bold text-white">{metrics.risk.onTrack}</p>
                        <p className="text-sm text-gray-400">Projetos em Dia</p>
                    </div>
                </div>
                 <div className="flex items-center gap-4 p-4 rounded-lg w-full md:w-auto">
                    <div className="bg-yellow-500/10 p-4 rounded-full"><Clock className="h-8 w-8 text-yellow-400"/></div>
                    <div>
                        <p className="text-3xl font-bold text-white">{metrics.risk.atRisk}</p>
                        <p className="text-sm text-gray-400">Em Risco (Próx. 5 dias)</p>
                    </div>
                </div>
                 <div className="flex items-center gap-4 p-4 rounded-lg w-full md:w-auto">
                    <div className="bg-red-500/10 p-4 rounded-full"><AlertTriangle className="h-8 w-8 text-red-400"/></div>
                    <div>
                        <p className="text-3xl font-bold text-white">{metrics.risk.overdue}</p>
                        <p className="text-sm text-gray-400">Projetos Atrasados</p>
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-8 glass-panel rounded-2xl p-6">
             <h2 className="text-xl font-semibold text-white mb-4 flex items-center"><Users size={20} className="mr-3 text-blue-400" /> Atividade do Cliente</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                    <p className="text-3xl font-bold text-white">{metrics.clientActivity.inApproval}</p>
                    <p className="text-sm text-gray-400">Projetos em Aprovação</p>
                </div>
                <div>
                    <p className="text-3xl font-bold text-white">{metrics.clientActivity.avgApprovalTime}</p>
                    <p className="text-sm text-gray-400">Tempo Médio de Aprovação</p>
                </div>
                <div>
                    <p className="text-3xl font-bold text-white">{metrics.clientActivity.inAdjustments}</p>
                    <p className="text-sm text-gray-400">Projetos com Ajustes</p>
                </div>
             </div>
        </div>

      </div>
    </div>
  );
};

export default AnalysisDashboardPage;