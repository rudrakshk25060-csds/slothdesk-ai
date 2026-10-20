import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../src/App';

describe('SlothDesk AI Frontend Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock API fetch calls
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/stats')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              files_organized: 4,
              documents_summarized: 2,
              deadlines_detected: 3,
              tasks_completed: 1,
              total_tasks: 4,
              pending_tasks: 3,
              ai_model: 'gemma3:4b',
              ai_status: 'active',
            }),
        });
      }
      if (url.includes('/api/ai/status')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              available: true,
              provider: 'Ollama',
              model: 'gemma3:4b',
              details: 'Local Gemma 3 4B is active',
              setup_instructions: [],
            }),
        });
      }
      if (url.includes('/api/documents')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: 'doc-1',
                filename: 'CS101_Syllabus.txt',
                original_name: 'CS101_Syllabus.txt',
                file_path: '/data/storage/CS101_Syllabus.txt',
                file_size: 2048,
                mime_type: 'text/plain',
                category: 'Education',
                char_count: 500,
                is_scanned: false,
                summary: 'Course syllabus for CS101 covering runtime complexity.',
                suggested_title: 'CS101 Algorithms Syllabus',
                action_items: ['Complete assignment 1'],
                deadlines: [{ title: 'Assignment 1', due_date: '2026-10-24', priority: 'High' }],
                is_ai_processed: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ]),
        });
      }
      if (url.includes('/api/tasks')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: 'task-1',
                title: 'Complete assignment 1',
                description: 'Runtime complexity analysis',
                due_date: '2026-10-24',
                priority: 'High',
                completed: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ]),
        });
      }
      if (url.includes('/api/briefing/latest')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'brief-1',
              date: '2026-10-20',
              top_priorities: ['Submit assignment 1', 'Review invoice'],
              tasks_due_today: [],
              upcoming_deadlines: [{ title: 'Assignment 1', due_date: '2026-10-24' }],
              recently_summarized: [],
              suggested_actions: ['Start with assignment 1'],
              sloth_quote: 'Slow and steady wins the race.',
              is_ai_generated: true,
              created_at: new Date().toISOString(),
            }),
        });
      }
      if (url.includes('/api/activity')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                id: 'act-1',
                action_type: 'import',
                title: 'Imported document',
                details: 'CS101_Syllabus.txt',
                status: 'success',
                created_at: new Date().toISOString(),
              },
            ]),
        });
      }
      if (url.includes('/api/settings')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              ai_provider: 'Ollama',
              ai_model: 'gemma3:4b',
              ai_available: true,
              data_storage_path: '/data/storage',
              app_version: '1.0.0',
              theme: 'light',
              privacy_mode: '100% Local',
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it('renders application branding and header elements', async () => {
    render(<App />);

    expect(screen.getAllByText(/SlothDesk/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Slow & steady productivity/i)).toBeInTheDocument();
    expect(screen.getByText(/Load Demo Workspace/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Gemma 3 4B: Active/i)).toBeInTheDocument();
    });
  });

  it('navigates to File Organizer and displays workspace files', async () => {
    render(<App />);

    const organizerBtn = screen.getByRole('button', { name: /File Organizer/i });
    fireEvent.click(organizerBtn);

    await waitFor(() => {
      expect(screen.getByText(/Generate AI Organization Plan/i)).toBeInTheDocument();
      expect(screen.getByText(/CS101_Syllabus.txt/i)).toBeInTheDocument();
    });
  });

  it('navigates to Tasks & Deadlines and displays tasks', async () => {
    render(<App />);

    const tasksBtn = screen.getByRole('button', { name: /Tasks & Deadlines/i });
    fireEvent.click(tasksBtn);

    await waitFor(() => {
      expect(screen.getByText(/Complete assignment 1/i)).toBeInTheDocument();
      expect(screen.getByText(/New Task/i)).toBeInTheDocument();
    });
  });

  it('navigates to Morning Briefing and displays the agenda', async () => {
    render(<App />);

    const briefingBtn = screen.getByRole('button', { name: /Morning Briefing/i });
    fireEvent.click(briefingBtn);

    await waitFor(() => {
      expect(screen.getByText(/Daily Morning Agenda/i)).toBeInTheDocument();
      expect(screen.getByText(/Slow and steady wins the race/i)).toBeInTheDocument();
    });
  });

  it('toggles light and dark themes successfully', async () => {
    render(<App />);

    const themeToggleBtn = screen.getByLabelText(/Toggle theme/i);
    expect(themeToggleBtn).toBeInTheDocument();

    fireEvent.click(themeToggleBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fireEvent.click(themeToggleBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
