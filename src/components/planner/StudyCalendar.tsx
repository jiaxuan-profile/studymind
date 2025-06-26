import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Views, momentLocalizer } from 'react-big-calendar';
import dayjs from 'dayjs';
import { supabase } from '../../services/supabase';
import { useToast } from '../../contexts/ToastContext';
import { useDemoMode } from '../../contexts/DemoModeContext';
import { Loader2, Calendar as CalendarIcon, BookOpen, ListChecks } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Create a dayjs localizer for React Big Calendar
const dayjsLocalizer = {
  format: (value: Date, format: string) => {
    return dayjs(value).format(format);
  },
  formats: {
    dateFormat: 'DD',
    dayFormat: 'DD ddd',
    monthHeaderFormat: 'MMMM YYYY',
    dayHeaderFormat: 'dddd MMM DD',
    dayRangeHeaderFormat: ({ start, end }: { start: Date, end: Date }) => 
      `${dayjs(start).format('MMMM DD')} - ${dayjs(end).format('MMMM DD, YYYY')}`,
    timeGutterFormat: 'HH:mm',
    agendaDateFormat: 'ddd MMM DD',
    agendaTimeFormat: 'HH:mm',
    agendaTimeRangeFormat: ({ start, end }: { start: Date, end: Date }) => 
      `${dayjs(start).format('HH:mm')} - ${dayjs(end).format('HH:mm')}`,
  },
  startOfWeek: () => {
    return dayjs().startOf('week').toDate();
  },
  firstOfWeek: () => {
    return dayjs().startOf('week').day();
  },
  parse: (value: string, format: string) => {
    return dayjs(value, format).toDate();
  }
};

// Define event types
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  type: 'exam' | 'task';
  status?: 'todo' | 'in_progress' | 'done' | 'skipped';
  resource?: any;
}

const StudyCalendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const { addToast } = useToast();
  const { isReadOnlyDemo } = useDemoMode();

  // Function to fetch events from Supabase
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      if (isReadOnlyDemo) {
        // Mock data for demo mode
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const mockEvents: CalendarEvent[] = [
          {
            id: 'exam-1',
            title: 'Midterm Exam',
            start: nextWeek,
            end: nextWeek,
            allDay: true,
            type: 'exam'
          },
          {
            id: 'task-1',
            title: 'Review Chapter 3',
            start: tomorrow,
            end: tomorrow,
            allDay: true,
            type: 'task',
            status: 'todo'
          },
          {
            id: 'task-2',
            title: 'Practice Problem Set',
            start: today,
            end: today,
            allDay: true,
            type: 'task',
            status: 'in_progress'
          }
        ];
        
        setEvents(mockEvents);
        setLoading(false);
        return;
      }

      // Fetch exam dates
      const { data: examDates, error: examError } = await supabase
        .from('exam_dates')
        .select('*')
        .order('date', { ascending: true });

      if (examError) throw examError;

      // Fetch study tasks
      const { data: studyTasks, error: tasksError } = await supabase
        .from('study_tasks')
        .select(`
          *,
          study_plan:study_plan_id(name)
        `)
        .order('due_date', { ascending: true });

      if (tasksError) throw tasksError;

      // Transform exam dates into calendar events
      const examEvents: CalendarEvent[] = (examDates || []).map(exam => ({
        id: `exam-${exam.id}`,
        title: exam.name,
        start: new Date(exam.date),
        end: new Date(exam.date),
        allDay: true,
        type: 'exam',
        resource: exam
      }));

      // Transform study tasks into calendar events
      const taskEvents: CalendarEvent[] = (studyTasks || []).map(task => ({
        id: `task-${task.id}`,
        title: task.description,
        start: task.due_date ? new Date(task.due_date) : new Date(),
        end: task.due_date ? new Date(task.due_date) : new Date(),
        allDay: true,
        type: 'task',
        status: task.status as 'todo' | 'in_progress' | 'done' | 'skipped',
        resource: {
          ...task,
          planName: task.study_plan?.name
        }
      }));

      // Combine all events
      setEvents([...examEvents, ...taskEvents]);
    } catch (error: any) {
      console.error('Error fetching calendar events:', error);
      addToast(`Failed to load calendar events: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [isReadOnlyDemo, addToast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Event style customization
  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '';
    let borderColor = '';
    let textColor = '';
    
    if (event.type === 'exam') {
      backgroundColor = 'rgba(239, 68, 68, 0.2)'; // red-500 with opacity
      borderColor = '#EF4444'; // red-500
      textColor = '#B91C1C'; // red-700
    } else if (event.type === 'task') {
      switch (event.status) {
        case 'done':
          backgroundColor = 'rgba(16, 185, 129, 0.2)'; // green-500 with opacity
          borderColor = '#10B981'; // green-500
          textColor = '#047857'; // green-700
          break;
        case 'in_progress':
          backgroundColor = 'rgba(245, 158, 11, 0.2)'; // amber-500 with opacity
          borderColor = '#F59E0B'; // amber-500
          textColor = '#B45309'; // amber-700
          break;
        case 'skipped':
          backgroundColor = 'rgba(156, 163, 175, 0.2)'; // gray-400 with opacity
          borderColor = '#9CA3AF'; // gray-400
          textColor = '#4B5563'; // gray-600
          break;
        default: // 'todo'
          backgroundColor = 'rgba(99, 102, 241, 0.2)'; // indigo-500 with opacity
          borderColor = '#6366F1'; // indigo-500
          textColor = '#4338CA'; // indigo-700
      }
    }

    return {
      style: {
        backgroundColor,
        borderLeft: `4px solid ${borderColor}`,
        color: textColor,
        borderRadius: '4px',
        opacity: 1,
        display: 'block',
        fontWeight: 500,
      }
    };
  };

  // Custom toolbar component
  const CustomToolbar = ({ label, onNavigate, onView }: any) => {
    return (
      <div className="flex justify-between items-center mb-4 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigate('TODAY')}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Today
          </button>
          <button
            onClick={() => onNavigate('PREV')}
            className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            &lt;
          </button>
          <button
            onClick={() => onNavigate('NEXT')}
            className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            &gt;
          </button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 ml-2">{label}</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onView('month')}
            className={`px-3 py-1.5 border rounded-md text-sm font-medium ${
              view === 'month'
                ? 'border-primary bg-primary text-white'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => onView('week')}
            className={`px-3 py-1.5 border rounded-md text-sm font-medium ${
              view === 'week'
                ? 'border-primary bg-primary text-white'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => onView('day')}
            className={`px-3 py-1.5 border rounded-md text-sm font-medium ${
              view === 'day'
                ? 'border-primary bg-primary text-white'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => onView('agenda')}
            className={`px-3 py-1.5 border rounded-md text-sm font-medium ${
              view === 'agenda'
                ? 'border-primary bg-primary text-white'
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            Agenda
          </button>
        </div>
      </div>
    );
  };

  // Custom event component
  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    const icon = event.type === 'exam' ? 
      <CalendarIcon className="h-3 w-3 mr-1" /> : 
      <ListChecks className="h-3 w-3 mr-1" />;
    
    return (
      <div className="flex items-center text-xs">
        {icon}
        <span className="truncate">{event.title}</span>
      </div>
    );
  };

  // Handle event selection
  const handleSelectEvent = (event: CalendarEvent) => {
    if (isReadOnlyDemo) {
      addToast('Event details are not available in demo mode', 'info');
      return;
    }
    
    if (event.type === 'exam') {
      addToast(`Exam: ${event.title} on ${dayjs(event.start).format('MMMM D, YYYY')}`, 'info');
    } else {
      const status = event.status || 'todo';
      const statusText = status.charAt(0).toUpperCase() + status.slice(1);
      const planName = event.resource?.planName ? ` (${event.resource.planName})` : '';
      addToast(`Task: ${event.title}${planName} - Status: ${statusText}`, 'info');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-gray-600 dark:text-gray-300">Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <CalendarIcon className="h-5 w-5 text-primary mr-2" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Study Calendar</h2>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span>
            <span className="text-xs text-gray-600 dark:text-gray-400">Exams</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-indigo-500 mr-1"></span>
            <span className="text-xs text-gray-600 dark:text-gray-400">Tasks</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span>
            <span className="text-xs text-gray-600 dark:text-gray-400">Completed</span>
          </div>
        </div>
      </div>
      
      <div className="h-[600px] calendar-container">
        <Calendar
          localizer={dayjsLocalizer as any}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          views={['month', 'week', 'day', 'agenda']}
          view={view as any}
          date={date}
          onNavigate={setDate}
          onView={(newView) => setView(newView)}
          eventPropGetter={eventStyleGetter}
          components={{
            toolbar: CustomToolbar,
            event: EventComponent as any,
          }}
          onSelectEvent={handleSelectEvent}
          popup
        />
      </div>
    </div>
  );
};

export default StudyCalendar;