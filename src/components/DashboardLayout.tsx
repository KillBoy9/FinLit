import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, ReceiptText, PieChart, Bot, Settings, LogOut, Wallet } from 'lucide-react';
import { auth } from '../lib/firebase';
import { cn } from '../lib/utils';

export function DashboardLayout() {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
    { name: 'Transactions', href: '/app/transactions', icon: ReceiptText },
    { name: 'Budgets', href: '/app/budgets', icon: PieChart },
    { name: 'AI Assistant', href: '/app/ai-assistant', icon: Bot },
  ];

  return (
    <div className="w-full h-full bg-[#0f172a] text-slate-100 flex overflow-hidden font-sans relative">
      {/* Mesh Gradient Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[150px] rounded-full pointer-events-none"></div>
      
      {/* Sidebar */}
      <aside className="w-20 sm:w-64 flex flex-col items-center sm:items-stretch py-8 sm:py-6 gap-10 sm:gap-6 bg-white/5 backdrop-blur-xl border-r border-white/10 z-10">
        <div className="hidden sm:flex h-16 items-center px-6 border-b border-white/10">
          <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mr-3">
            <Wallet className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">FinLit</h1>
        </div>

        <div className="sm:hidden w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mx-auto">
          <Wallet className="h-6 w-6 text-white" />
        </div>
        
        <nav className="flex-1 px-4 sm:py-2 space-y-2 flex flex-col items-center sm:items-stretch gap-4 sm:gap-1 opacity-80">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center sm:px-3 sm:py-2.5 p-2 rounded-lg transition-colors group",
                  isActive 
                    ? "bg-white/10 text-white opacity-100" 
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                )}
                title={item.name}
              >
                <item.icon className={cn("sm:mr-3 h-6 w-6 sm:h-5 sm:w-5", isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-300")} />
                <span className="hidden sm:block text-sm font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>
        
        <div className="p-4 border-t border-white/10 space-y-2 flex flex-col items-center sm:items-stretch opacity-80">
          <Link
            to="/app/settings"
            className={cn(
              "flex items-center sm:px-3 sm:py-2.5 p-2 rounded-lg transition-colors group",
              location.pathname === '/app/settings' ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
            )}
            title="Settings"
          >
            <Settings className="sm:mr-3 h-6 w-6 sm:h-5 sm:w-5 text-slate-400 group-hover:text-slate-300" />
            <span className="hidden sm:block text-sm font-medium">Settings</span>
          </Link>
          <button
            onClick={() => auth.signOut()}
            className="flex items-center sm:w-full sm:px-3 sm:py-2.5 p-2 text-sm font-medium text-rose-400 rounded-lg hover:bg-white/5 transition-colors group"
            title="Sign Out"
          >
            <LogOut className="sm:mr-3 h-6 w-6 sm:h-5 sm:w-5 text-rose-500 group-hover:text-rose-400" />
            <span className="hidden sm:block">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-8 gap-6 z-10 overflow-y-auto custom-scrollbar relative">
        <Outlet />
      </main>
    </div>
  );
}
