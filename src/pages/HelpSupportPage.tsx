// src/components/HelpSupportPage.tsx
import React, { useState } from 'react';
import {
  HelpCircle,
  MessageCircle,
  Mail,
  Book,
  Video,
  FileText,
  Search,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Send,
  CheckCircle,
  Info // Added for demo message icon
} from 'lucide-react';
import { useDemoMode } from '../contexts/DemoModeContext'; // Import the hook

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface ContactFormType {
  name: string;
  email: string;
  subject: string;
  message: string;
  category: string;
}

// No longer needs HelpSupportPageProps for isReadOnlyDemo
const HelpSupportPage: React.FC = () => {
  const { isReadOnlyDemo } = useDemoMode(); // Get isReadOnlyDemo from context

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<ContactFormType>({
    name: '',
    email: '',
    subject: '',
    message: '',
    category: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const faqs: FAQItem[] = [
    {
      id: '1',
      question: 'How do I upload documents to StudyMind?',
      answer: 'You can upload documents by going to the Notes page and clicking the "Upload Document" button. StudyMind supports PDF, DOCX, MD, and TXT files. Enable AI analysis during upload to automatically generate review questions and concept maps.',
      category: 'getting-started'
    },
    {
      id: '2',
      question: 'What is the Pomodoro timer and how do I use it?',
      answer: 'The Pomodoro timer is a productivity tool integrated into StudyMind. Click the timer icon in the bottom-right corner to access it. You can customize work periods (1-120 minutes), break durations (1-30 minutes for short breaks, 1-60 minutes for long breaks), and cycles before long breaks (2-10 cycles). Note: Settings changes take effect after you reset the timer. The timer helps you maintain concentration while studying and tracks your focus sessions.',
      category: 'features'
    },
    {
      id: '3',
      question: 'How does the AI-powered review system work?',
      answer: 'StudyMind features an advanced review system with wizard-style setup. Go to the Review page, select your notes and difficulty level (easy/medium/hard/all), choose question type (currently short answer, with MCQ and open-ended coming soon), then start a session. The AI creates personalized questions based on your content and tracks your progress over time with session-based learning.',
      category: 'features'
    },
    {
      id: '4',
      question: 'Can I see connections between my notes and concepts?',
      answer: 'Yes! Visit the Concept Graph page to see visual connections between concepts in your notes. The graph shows relationships and helps you understand how different topics relate to each other. You can zoom in to see concept names and relationships, and click on nodes to view detailed information.',
      category: 'features'
    },
    {
      id: '5',
      question: 'What is the Concept Mastery System?',
      answer: 'StudyMind uses a 3-tier mastery classification system: 🟢 Mastered (≥70%) - used as foundation for new questions, 🟡 Developing (30-70%) - targeted with focused practice, 🔴 Struggling (<30%) - flagged for remedial attention. The system provides adaptive question weights with higher frequency of developing concept questions and gradual reintroduction of struggling concepts.',
      category: 'features'
    },
    {
      id: '6',
      question: 'How does session-based review tracking work?',
      answer: 'StudyMind tracks your review sessions comprehensively. Each session gets a unique ID, stores all your answers with session context, provides real-time statistics, and maintains a complete review history. You can view past sessions, track improvement over time, and see completion rates and difficulty distributions.',
      category: 'features'
    },
    {
      id: '7',
      question: 'How do I reset my password?',
      answer: 'On the login page, click "Forgot your password?" and enter your email address. You\'ll receive instructions to reset your password. If you don\'t receive the email, check your spam folder.',
      category: 'account'
    },
    {
      id: '8',
      question: 'Is my data secure and private?',
      answer: 'Yes, StudyMind takes data security seriously. All your notes and personal information are encrypted and stored securely. We use industry-standard security practices and never share your data with third parties.',
      category: 'account'
    },
    {
      id: '9',
      question: 'Why aren\'t my review questions generating?',
      answer: 'Make sure you have AI analysis enabled when uploading documents. If questions still don\'t appear, try uploading documents with more substantial content. Very short notes may not generate enough questions for review.',
      category: 'troubleshooting'
    },
    {
      id: '10',
      question: 'The concept graph is not showing any connections. What should I do?',
      answer: 'Concept connections are created when you upload documents with AI analysis enabled. If you have existing notes without AI analysis, try re-uploading them with AI enabled, or create new notes with substantial content.',
      category: 'troubleshooting'
    },
    {
      id: '11',
      question: 'How does the focus time analytics work?',
      answer: 'The integrated Pomodoro timer tracks your daily productivity and focus patterns. It monitors completed pomodoros, total focus time, current streak, and provides session statistics. You can view your focus time alongside learning progress for comprehensive productivity insights.',
      category: 'features'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Topics', icon: Book },
    { id: 'getting-started', name: 'Getting Started', icon: FileText },
    { id: 'features', name: 'Features', icon: HelpCircle },
    { id: 'account', name: 'Account', icon: MessageCircle },
    { id: 'troubleshooting', name: 'Troubleshooting', icon: Search }
  ];

  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = searchTerm === '' ||
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (isReadOnlyDemo) {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
      setSubmitSuccess(true);
      setIsSubmitting(false);

      setTimeout(() => {
        setContactForm({ name: '', email: '', subject: '', message: '', category: 'general' });
        setSubmitSuccess(false);
      }, 3000);
      console.log("Contact form submitted (Demo Mode):", contactForm);
      // You could use a global toast here if you have one:
      // e.g., addToast("This is a demo. Your message was not actually sent.", "info");
      return;
    }

    // --- Real submission logic would go here if not in demo mode ---
    // For now, it remains a mock for non-demo too.
    // Replace this with an actual API call (e.g., using fetch or axios).
    console.log("Attempting real submission with:", contactForm);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setSubmitSuccess(true);
    setIsSubmitting(false);
    setTimeout(() => {
      setContactForm({ name: '', email: '', subject: '', message: '', category: 'general' });
      setSubmitSuccess(false);
    }, 3000);
    // --- End of real submission logic placeholder ---
  };

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const inputClasses = "block w-full h-12 rounded-lg border-2 border-gray-400 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 transition-all duration-200";
  const textareaClasses = "block w-full rounded-lg border-2 border-gray-400 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 p-4 transition-all duration-200";

  return (
    <div className="fade-in bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <HelpCircle className="h-8 w-8 text-primary mr-3" />
            Help & Support
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Find answers to common questions or get in touch with our support team
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center hover:shadow-xl transition-shadow">
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Book className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">User Guide</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Complete guide to using StudyMind</p>
                <button className="text-primary hover:text-primary-dark text-sm font-medium flex items-center mx-auto">
                  View Guide <ExternalLink className="h-4 w-4 ml-1" />
                </button>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center hover:shadow-xl transition-shadow">
                <div className="h-12 w-12 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="h-6 w-6 text-secondary" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Video Tutorials</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Step-by-step video guides</p>
                <button className="text-secondary hover:text-secondary-dark text-sm font-medium flex items-center mx-auto">
                  Watch Videos <ExternalLink className="h-4 w-4 ml-1" />
                </button>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center hover:shadow-xl transition-shadow">
                <div className="h-12 w-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Community</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Connect with other users</p>
                <button className="text-accent hover:text-accent-dark text-sm font-medium flex items-center mx-auto">
                  Join Community <ExternalLink className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Frequently Asked Questions</h2>
              </div>

              <div className="p-6">
                {/* Search and Filter */}
                <div className="mb-6 space-y-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-3 border-2 border-gray-400 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                      placeholder="Search FAQs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => {
                      const Icon = category.icon;
                      return (
                        <button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            selectedCategory === category.id
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          <Icon className="h-4 w-4 mr-1" />
                          {category.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* FAQ List */}
                <div className="space-y-4">
                  {filteredFAQs.length > 0 ? (
                    filteredFAQs.map((faq) => (
                      <div key={faq.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                        <button
                          onClick={() => toggleFAQ(faq.id)}
                          className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <span className="font-medium text-gray-900 dark:text-gray-100">{faq.question}</span>
                          {expandedFAQ === faq.id ? (
                            <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                          )}
                        </button>
                        {expandedFAQ === faq.id && (
                          <div className="px-4 pb-3 text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700">
                            <p className="pt-3">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Search className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No FAQs found</h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {searchTerm ? `No results for "${searchTerm}"` : 'No FAQs in this category'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-accent/10 to-warning/10 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
                  <Mail className="h-5 w-5 mr-2" />
                  Contact Support
                </h3>
              </div>

              <div className="p-6">
                {isReadOnlyDemo && !submitSuccess && (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg text-blue-700 dark:text-blue-300 text-sm flex items-start">
                    <Info className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                    <span>
                      This contact form is for demonstration purposes. Messages will not be sent.
                    </span>
                  </div>
                )}
                {submitSuccess ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      {isReadOnlyDemo ? "Demo Message Submitted!" : "Message Sent!"}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400">
                      {isReadOnlyDemo
                        ? "Thank you for trying out the form."
                        : "We'll get back to you within 24 hours."
                      }
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        required
                        className={inputClasses}
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        // Optionally disable inputs in demo mode if you don't want them editable
                        // disabled={isReadOnlyDemo} 
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        required
                        className={inputClasses}
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        // disabled={isReadOnlyDemo}
                      />
                    </div>

                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category
                      </label>
                      <div className="relative">
                        <select
                          id="category"
                          className="block w-full h-12 rounded-lg border-2 border-gray-400 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-50 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 pl-4 pr-12 transition-all duration-200 appearance-none cursor-pointer"
                          value={contactForm.category}
                          onChange={(e) => setContactForm({ ...contactForm, category: e.target.value })}
                          // disabled={isReadOnlyDemo}
                        >
                          <option value="general">General Question</option>
                          <option value="technical">Technical Issue</option>
                          <option value="feature">Feature Request</option>
                          <option value="billing">Billing</option>
                          <option value="bug">Bug Report</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                          <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Subject
                      </label>
                      <input
                        type="text"
                        id="subject"
                        required
                        className={inputClasses}
                        value={contactForm.subject}
                        onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                        // disabled={isReadOnlyDemo}
                      />
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Message
                      </label>
                      <textarea
                        id="message"
                        rows={4}
                        required
                        className={textareaClasses}
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        // disabled={isReadOnlyDemo}
                      />
                    </div>

                    <button
                      type="submit"
                      // The button is disabled if it's currently submitting.
                      // In demo mode, it will still appear active until clicked,
                      // then go through the mock submission.
                      disabled={isSubmitting}
                      className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5 mr-2" />
                          Send Message
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Quick Links</h3>
                <div className="space-y-3">
                  <a
                    href="#" // Replace with actual links
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Getting Started Guide
                  </a>
                  <a
                    href="#" // Replace with actual links
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Video Tutorials
                  </a>
                  <a
                    href="#" // Replace with actual links
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors"
                  >
                    <Book className="h-4 w-4 mr-2" />
                    API Documentation {/* If applicable */}
                  </a>
                  <a
                    href="#" // Replace with actual links
                    className="flex items-center text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Community Forum
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSupportPage;