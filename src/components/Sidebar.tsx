import React from 'react';
import { NavLink } from 'react-router-dom';
import { Book, BrainCircuit, Home, X, TextQuote as NotebookText, GraduationCap, Clock, HelpCircle, History, Layers } from 'lucide-react';
import { useStore } from '../store';

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobile, onClose }) => {
  const { notes } = useStore();

  const recentNotes = [...notes]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5);

  return (
    <div className={`w-64 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${mobile ? 'absolute inset-y-0 left-0' : ''}`}>
      {mobile && (
        <div className="absolute top-0 right-0 -mr-12 pt-2">
          <button
            type="button"
            className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            onClick={onClose}
          >
            <span className="sr-only">Close sidebar</span>
            <X className="h-6 w-6 text-white" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Logo */}
      <div className="flex items-center h-16 px-4">
        <div className="flex items-center">
          <Book className="h-8 w-8 text-primary" />
          <span className="ml-2 text-xl font-bold text-gray-900 dark:text-gray-100">StudyMind</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        <NavLink
          to="/"
          className={({ isActive }) =>
            isActive
              ? "flex items-center px-2 py-2 text-sm font-medium rounded-md bg-primary text-white"
              : "flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
          }
          end
        >
          <Home className="mr-3 h-5 w-5" />
          Dashboard
        </NavLink>

        <NavLink
          to="/notes"
          className={({ isActive }) =>
            isActive
              ? "flex items-center px-2 py-2 text-sm font-medium rounded-md bg-primary text-white"
              : "flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
          }
        >
          <NotebookText className="mr-3 h-5 w-5" />
          Notes
        </NavLink>

        <NavLink
          to="/concepts"
          className={({ isActive }) =>
            isActive
              ? "flex items-center px-2 py-2 text-sm font-medium rounded-md bg-primary text-white"
              : "flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
          }
        >
          <BrainCircuit className="mr-3 h-5 w-5" />
          Concept Graph
        </NavLink>

        <NavLink
          to="/flashcards"
          className={({ isActive }) =>
            isActive
              ? "flex items-center px-2 py-2 text-sm font-medium rounded-md bg-primary text-white"
              : "flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
          }
        >
          <Layers className="mr-3 h-5 w-5" />
          Flashcards
        </NavLink>

        <NavLink
          to="/review"
          className={({ isActive }) =>
            isActive
              ? "flex items-center px-2 py-2 text-sm font-medium rounded-md bg-primary text-white"
              : "flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
          }
        >
          <GraduationCap className="mr-3 h-5 w-5" />
          Review
        </NavLink>

        <NavLink
          to="/history"
          className={({ isActive }) =>
            isActive
              ? "flex items-center px-2 py-2 text-sm font-medium rounded-md bg-primary text-white"
              : "flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
          }
        >
          <History className="mr-3 h-5 w-5" />
          Review History
        </NavLink>

        {recentNotes.length > 0 && (
          <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Recent Notes
            </h3>
            <div className="mt-2 space-y-1">
              {recentNotes.map(note => (
                <NavLink
                  key={note.id}
                  to={`/notes/${note.id}`}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive
                      ? 'text-primary bg-primary/5'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                    }`
                  }
                >
                  <Clock className="mr-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <span className="truncate">{note.title}</span>
                </NavLink>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
          <NavLink
            to="/help"
            className={({ isActive }) =>
              isActive
                ? "flex items-center px-2 py-2 text-sm font-medium rounded-md bg-primary text-white"
                : "flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100"
            }
          >
            <HelpCircle className="mr-3 h-5 w-5" />
            Help & Support
          </NavLink>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;