import { useState } from 'react';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { AICoachPage } from './components/AICoachPage';
import { DashboardPage } from './components/DashboardPage';
import { TransactionsPage } from './components/TransactionsPage';
import { GoalsPage } from './components/GoalsPage';
import { RemindersPage } from './components/RemindersPage';
import { SettingsPage } from './components/SettingsPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />;
      case 'coach':
        return <AICoachPage />;
      case 'dashboard':
        return <DashboardPage />;
      case 'transactions':
        return <TransactionsPage />;
      case 'goals':
        return <GoalsPage />;
      case 'reminders':
        return <RemindersPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Header currentPage={currentPage} onPageChange={setCurrentPage} />
      
      <main className="p-4 lg:p-8">
        {renderPage()}
      </main>
    </div>
  );
}
