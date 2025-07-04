// src/components/Header.tsx
import React, { useState } from 'react';
import { Menu, Search, Bell, Moon, Sun, LogOut } from 'lucide-react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationCenter from './NotificationCenter';
import Dialog from './Dialog';

interface HeaderProps {
  toggleSidebar: () => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, onLogout }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { theme, toggleTheme, notes } = useStore();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  
  // Filter notes based on search term
  const searchResults = searchTerm.length > 2 
    ? notes.filter(note => 
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      ).slice(0, 5) 
    : [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/notes?search=${encodeURIComponent(searchTerm)}`);
      setShowSearchResults(false);
      setSearchTerm('');
    }
  };

  const handleResultClick = (noteId: string) => {
    navigate(`/notes/${noteId}`);
    setShowSearchResults(false);
    setSearchTerm('');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSearchResults(value.length > 2);
  };

  const handleSearchBlur = () => {
    setTimeout(() => setShowSearchResults(false), 200);
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
      setShowLogoutDialog(false);
    }
  };
  
  return (
    <>
      <header className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white dark:bg-gray-900 shadow-sm dark:shadow-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          className="px-4 border-r border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:focus:ring-blue-400 md:hidden transition-colors"
          onClick={toggleSidebar}
        >
          <span className="sr-only">Open sidebar</span>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
        
        <div className="flex-1 px-4 flex justify-between">
          <div className="flex-1 flex">
            <div className="w-full flex md:ml-0 relative">
              <form onSubmit={handleSearchSubmit} className="relative w-full text-gray-400 dark:text-gray-500 focus-within:text-gray-600 dark:focus-within:text-gray-300">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5" aria-hidden="true" />
                </div>
                <input
                  id="search-field"
                  className="block w-full h-full pl-10 pr-3 py-2 border-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:placeholder-gray-500 dark:focus:placeholder-gray-400 focus:ring-0 focus:border-transparent sm:text-sm bg-transparent"
                  placeholder="Search notes, concepts, and more..."
                  type="search"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onBlur={handleSearchBlur}
                  onFocus={() => searchTerm.length > 2 && setShowSearchResults(true)}
                />
                
                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg dark:shadow-2xl z-50 max-h-80 overflow-y-auto">
                    <div className="p-2">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                        Search Results ({searchResults.length})
                      </div>
                      {searchResults.map((note) => (
                        <button
                          key={note.id}
                          onClick={() => handleResultClick(note.id)}
                          className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                        >
                          <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{note.title}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300 truncate mt-1">
                            {note.content.replace(/[#*`]/g, '').substring(0, 100)}...
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {note.tags.slice(0, 3).map((tag, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </button>
                      ))}
                      {searchTerm.length > 2 && (
                        <button
                          onClick={() => {
                            navigate(`/notes?search=${encodeURIComponent(searchTerm)}`);
                            setShowSearchResults(false);
                            setSearchTerm('');
                          }}
                          className="w-full text-left p-3 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors border-t border-gray-100 dark:border-gray-700"
                        >
                          <div className="flex items-center">
                            <Search className="h-4 w-4 mr-2" />
                            View all results for "{searchTerm}"
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                {/* No Results Message */}
                {showSearchResults && searchTerm.length > 2 && searchResults.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg dark:shadow-2xl z-50">
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      <Search className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <div className="text-sm">No results found for "{searchTerm}"</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try different keywords or check spelling</div>
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
          
          <div className="ml-4 flex items-center md:ml-6 space-x-2">
            <button 
              className="p-2 rounded-md text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 transition-colors"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Moon className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
            
            <button 
              className="relative p-2 rounded-md text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 transition-colors"
              onClick={() => setShowNotificationCenter(true)}
              title="View notifications"
            >
              <span className="sr-only">View notifications</span>
              <Bell className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-red-500 dark:bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium shadow-sm">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            
            <button 
              onClick={handleLogoutClick}
              className="p-2 rounded-md text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Notification Center */}
      <NotificationCenter 
        isOpen={showNotificationCenter}
        onClose={() => setShowNotificationCenter(false)}
      />

      {/* Logout Confirmation Dialog */}
      <Dialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        title="Sign Out"
        message="Are you sure you want to sign out? You will need to log in again to access your notes."
        onConfirm={handleLogoutConfirm}
        confirmText="Sign Out"
        cancelText="Cancel"
        loading={isLoggingOut}
        variant="default"
      />
    </>
  );
};

export default Header;