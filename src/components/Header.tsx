import React, { useState } from 'react';
import { Menu, Search, Bell, Settings, Moon, Sun, LogOut } from 'lucide-react';
import { useStore } from '../store';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const { theme, toggleTheme, notes } = useStore();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  
  // Filter notes based on search term
  const searchResults = searchTerm.length > 2 
    ? notes.filter(note => 
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      ).slice(0, 5) // Limit to 5 results
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
    // Delay hiding results to allow clicking on them
    setTimeout(() => setShowSearchResults(false), 200);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  return (
    <header className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white shadow">
      <button
        type="button"
        className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary md:hidden"
        onClick={toggleSidebar}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>
      
      <div className="flex-1 px-4 flex justify-between">
        <div className="flex-1 flex">
          <div className="w-full flex md:ml-0 relative">
            <form onSubmit={handleSearchSubmit} className="relative w-full text-gray-400 focus-within:text-gray-600">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-5 w-5" aria-hidden="true" />
              </div>
              <input
                id="search-field"
                className="block w-full h-full pl-10 pr-3 py-2 border-transparent text-gray-900 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-0 focus:border-transparent sm:text-sm"
                placeholder="Search notes, concepts, and more..."
                type="search"
                value={searchTerm}
                onChange={handleSearchChange}
                onBlur={handleSearchBlur}
                onFocus={() => searchTerm.length > 2 && setShowSearchResults(true)}
              />
              
              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 px-3 py-2 border-b border-gray-100">
                      Search Results ({searchResults.length})
                    </div>
                    {searchResults.map((note) => (
                      <button
                        key={note.id}
                        onClick={() => handleResultClick(note.id)}
                        className="w-full text-left p-3 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        <div className="font-medium text-gray-900 truncate">{note.title}</div>
                        <div className="text-sm text-gray-600 truncate mt-1">
                          {note.content.replace(/[#*`]/g, '').substring(0, 100)}...
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {note.tags.slice(0, 3).map((tag, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
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
                        className="w-full text-left p-3 text-primary hover:bg-primary/5 rounded-md transition-colors border-t border-gray-100"
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
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="p-4 text-center text-gray-500">
                    <Search className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <div className="text-sm">No results found for "{searchTerm}"</div>
                    <div className="text-xs text-gray-400 mt-1">Try different keywords or check spelling</div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
        
        <div className="ml-4 flex items-center md:ml-6 space-x-4">
          <button 
            className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? (
              <Sun className="h-6 w-6\" aria-hidden="true" />
            ) : (
              <Moon className="h-6 w-6\" aria-hidden="true" />
            )}
          </button>
          
          <button className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
            <span className="sr-only">View notifications</span>
            <Bell className="h-6 w-6" aria-hidden="true" />
          </button>
          
          <button className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
            <span className="sr-only">Settings</span>
            <Settings className="h-6 w-6" aria-hidden="true" />
          </button>
          
          <button 
            onClick={handleSignOut}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4 mr-1" />
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;