import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function DarkModeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400 focus:outline-none transition-colors duration-300"
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Sun size={20} className="transition-transform duration-300 hover:rotate-12" />
      ) : (
        <Moon size={20} className="transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
