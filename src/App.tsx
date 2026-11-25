import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LoginScreen } from './components/LoginScreen';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PublicRegistrationForm } from './components/PublicRegistrationForm';

// Operator views
import { OperatorDashboard } from './components/operator/OperatorDashboard';
import { NewRequestModal } from './components/operator/NewRequestModal';
import { MyRequests } from './components/operator/MyRequests';
import { InvoicesView } from './components/operator/InvoicesView';
import { PaymentsView } from './components/operator/PaymentsView';
import { AccountabilityView } from './components/operator/AccountabilityView';
import { OperatorHistory } from './components/operator/OperatorHistory';

// Finance / Admin views
import { FinanceDashboard } from './components/finance/FinanceDashboard';
import { ReceivedRequests } from './components/finance/ReceivedRequests';
import { InvoiceReview } from './components/finance/InvoiceReview';
import { PaymentsManagement } from './components/finance/PaymentsManagement';
import { AccountabilityReview } from './components/finance/AccountabilityReview';
import { ReportsView } from './components/finance/ReportsView';
import { UsersManagement } from './components/finance/UsersManagement';
import { AuditLogView } from './components/finance/AuditLogView';
import { CadastrosFullView } from './components/admin/CadastrosFullView';

// Team-specific views
import { NotaTeamDashboard } from './components/teams/NotaTeamDashboard';
import { NotaFiscaisArea } from './components/teams/NotaFiscaisArea';
import { AmetaTeamDashboard } from './components/teams/AmetaTeamDashboard';
import { ComprovantesArea } from './components/teams/ComprovantesArea';

function isPublicCadastroUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return (
    params.get('cadastro') === '1' ||
    window.location.hash === '#/cadastro' ||
    window.location.pathname.endsWith('/cadastro')
  );
}

function MainContent() {
  const { currentUser, activeRole } = useApp();
  const [currentTab, setCurrentTab] = useState('op-dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPublicForm, setShowPublicForm] = useState<boolean>(() => isPublicCadastroUrl());

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'vistoria_nota') {
      setCurrentTab('nota-dashboard');
    } else if (currentUser.role === 'vistoria_ameta') {
      setCurrentTab('ameta-dashboard');
    } else if (currentUser.role === 'operador') {
      setCurrentTab('op-dashboard');
    } else {
      setCurrentTab('fin-dashboard');
    }
  }, [currentUser?.id, currentUser?.role]);

  if (showPublicForm) {
    return <PublicRegistrationForm onBackToLogin={() => setShowPublicForm(false)} />;
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  const renderContent = () => {
    // Hard isolation for Equipe de Vistoria – Notas
    if (currentUser.role === 'vistoria_nota') {
      if (currentTab === 'nota-fiscais') return <NotaFiscaisArea />;
      return <NotaTeamDashboard setCurrentTab={setCurrentTab} />;
    }

    // Hard isolation for Equipe Vistoria Ameta – Comprovantes
    if (currentUser.role === 'vistoria_ameta') {
      if (currentTab === 'ameta-comprovantes') return <ComprovantesArea />;
      if (currentTab === 'ameta-new-request') return <NewRequestModal setCurrentTab={setCurrentTab} />;
      if (currentTab === 'ameta-requests') return <MyRequests />;
      return <AmetaTeamDashboard setCurrentTab={setCurrentTab} />;
    }

    switch (currentTab) {
      // Cadastros Prestadores: apenas Coordenação e Financeiro (admin / financeiro)
      case 'cadastros-list':
        return currentUser.role === 'admin' || currentUser.role === 'financeiro' ? (
          <CadastrosFullView onOpenPublicForm={() => setShowPublicForm(true)} />
        ) : (
          <OperatorDashboard setCurrentTab={setCurrentTab} />
        );
      case 'nota-dashboard':
        return currentUser.role === 'operador' ? (
          <OperatorDashboard setCurrentTab={setCurrentTab} />
        ) : (
          <NotaTeamDashboard setCurrentTab={setCurrentTab} />
        );
      case 'nota-fiscais':
        return currentUser.role === 'operador' ? (
          <OperatorDashboard setCurrentTab={setCurrentTab} />
        ) : (
          <NotaFiscaisArea />
        );
      case 'ameta-dashboard':
        return currentUser.role === 'operador' ? (
          <OperatorDashboard setCurrentTab={setCurrentTab} />
        ) : (
          <AmetaTeamDashboard setCurrentTab={setCurrentTab} />
        );
      case 'ameta-comprovantes':
        return currentUser.role === 'operador' ? (
          <OperatorDashboard setCurrentTab={setCurrentTab} />
        ) : (
          <ComprovantesArea />
        );

      // Operator tabs
      case 'op-dashboard':
        return <OperatorDashboard setCurrentTab={setCurrentTab} />;
      case 'op-new-request':
        return <NewRequestModal setCurrentTab={setCurrentTab} />;
      case 'op-requests':
        return <MyRequests />;
      case 'op-invoices':
        return <InvoicesView />;
      case 'op-payments':
        return <PaymentsView />;
      case 'op-accountability':
        return <AccountabilityView />;
      case 'op-history':
        return <OperatorHistory />;

      // Finance / Admin tabs
      case 'fin-dashboard':
        return <FinanceDashboard setCurrentTab={setCurrentTab} />;
      case 'fin-received':
      case 'fin-auth-nf':
        return <ReceivedRequests />;
      case 'fin-conf-nf':
        return <InvoiceReview />;
      case 'fin-payments':
        return <PaymentsManagement />;
      case 'fin-accountability':
        return <AccountabilityReview />;
      case 'fin-reports':
        return <ReportsView />;
      case 'fin-users':
        return <UsersManagement />;
      case 'fin-audit':
        return <AuditLogView />;

      default:
        return activeRole === 'operador' ? (
          <OperatorDashboard setCurrentTab={setCurrentTab} />
        ) : (
          <FinanceDashboard setCurrentTab={setCurrentTab} />
        );
    }
  };

  return (
    <div className="flex h-[100dvh] bg-slate-100 overflow-hidden font-sans relative">
      {currentUser.isFirstLogin && <ChangePasswordModal />}

      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 custom-scrollbar">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
