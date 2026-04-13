import React from 'react';
import {
  User,
  FileText,
  Award,
  Settings,
  LogOut,
  Home,
  Shield,
  History,
} from 'lucide-react';

type SidebarSection =
  | 'overview'
  | 'personal'
  | 'verification'
  | 'history'
  | 'achievements'
  | 'settings';

interface SidebarProps {
  activeSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
  onLogout: () => void;
}

interface NavItem {
  id: SidebarSection;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <Home size={20} /> },
  { id: 'personal', label: 'Personal Info', icon: <User size={20} /> },
  { id: 'verification', label: 'Verification', icon: <Shield size={20} /> },
  { id: 'history', label: 'History', icon: <History size={20} /> },
  { id: 'achievements', label: 'Achievements', icon: <Award size={20} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
];

export default function Sidebar({
  activeSection,
  onSectionChange,
  onLogout,
}: SidebarProps) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-[calc(100vh-64px)] fixed left-0 top-16 overflow-y-auto">
      <div className="p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900 mb-6">
          Menu
        </h2>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium transition-all ${
                activeSection === item.id
                  ? 'bg-brand-50 text-brand-600 border-l-4 border-brand-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left font-medium text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
