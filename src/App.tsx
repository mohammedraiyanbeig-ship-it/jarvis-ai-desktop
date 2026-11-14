import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useDesktopAssistant } from './hooks/useDesktopAssistant';

type ChatMessage = { id: string; role: 'assistant' | 'user'; text: string };
type Reminder = { id: string; title: string; dueAt: string; done: boolean };
type Note = { id: string; title: string; body: string; createdAt: string };

type SpeechRecognition = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition };

const initialMessages: ChatMessage[] = [
  { id: 'welcome', role: 'assistant', text: 'Good to see you. I’m Jarvis, your personal assistant. What would you like to work on?' }
];
const suggestions = ['Plan my day', 'Help me focus', 'Capture a note'];
const apiUrl = import.meta.env.VITE_JARVIS_API_URL ?? 'http://127.0.0.1:8787';

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function App() {
  useDesktopAssistant();
  const [messages, setMessages] = useState<ChatMessage[]>(() => readStorage('jarvis.messages', initialMessages));
  const [reminders, setReminders] = useState<Reminder[]>(() => readStorage('jarvis.reminders', []));
  const [notes, setNotes] = useState<Note[]>(() => readStorage('jarvis.notes', []));
  const [memory, setMemory] = useState(() => localStorage.getItem('jarvis.memory') ?? '');
  const [draft, setDraft] = useState('');
  const [activePage, setActivePage] = useState('Assistant');
  const [voiceStatus, setVoiceStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem('jarvis.messages', JSON.stringify(messages)); endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { localStorage.setItem('jarvis.reminders', JSON.stringify(reminders)); }, [reminders]);
  useEffect(() => { localStorage.setItem('jarvis.notes', JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem('jarvis.memory', memory); }, [memory]);

  async function send(text = draft) {
    const prompt = text.trim();
    if (!prompt || isLoading) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: prompt };
    const history = [...messages, userMessage].filter((message) => message.id !== 'welcome').slice(-20)
      .map(({ role, text: messageText }) => ({ role, text: messageText }));
    setMessages((current) => [...current, userMessage]);
    setDraft('');
    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, memory })
      });
      const result = await response.json() as { text?: string; error?: string };
      if (!response.ok) throw new Error(result.error || `Gemini request failed (${response.status})`);
      if (!result.text) throw new Error('Gemini returned an empty response.');
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: result.text! }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not reach the Jarvis API.';
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: `I couldn’t get a response from Gemini. ${message}` }]);
    } finally { setIsLoading(false); }
  }

  function submitChat(event: FormEvent) { event.preventDefault(); void send(); }
  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); }
  }
  function startVoice() {
    const Recognition = (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition;
    if (!Recognition) { setVoiceStatus('Voice input is not supported by this system webview.'); return; }
    const recognition = new Recognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = false;
    recognition.onresult = (event) => { const transcript = event.results[0]?.[0]?.transcript; if (transcript) setDraft((current) => current ? `${current} ${transcript}` : transcript); };
    recognition.onerror = () => setVoiceStatus('Could not access voice input. Check microphone permissions.');
    recognition.onend = () => setVoiceStatus('');
    setVoiceStatus('Listening…');
    recognition.start();
  }
  function addReminder(event: FormEvent) {
    event.preventDefault();
    if (!reminderTitle.trim() || !reminderDate || Number.isNaN(new Date(reminderDate).getTime())) return;
    setReminders((current) => [...current, { id: crypto.randomUUID(), title: reminderTitle.trim(), dueAt: new Date(reminderDate).toISOString(), done: false }].sort((a, b) => a.dueAt.localeCompare(b.dueAt)));
    setReminderTitle(''); setReminderDate('');
  }
  function addNote(event: FormEvent) {
    event.preventDefault();
    if (!noteTitle.trim() && !noteBody.trim()) return;
    setNotes((current) => [{ id: crypto.randomUUID(), title: noteTitle.trim() || 'Untitled note', body: noteBody.trim(), createdAt: new Date().toISOString() }, ...current]);
    setNoteTitle(''); setNoteBody('');
  }

  const nav = ['Assistant', 'Reminders', 'Notes', 'Settings'];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-icon">J</div><div><span className="muted-label">PERSONAL AI</span><strong>Jarvis</strong></div></div>
        <button className="new-chat" onClick={() => { setMessages(initialMessages); setActivePage('Assistant'); }}><span>＋</span> New conversation</button>
        <div className="nav-label">WORKSPACE</div>
        <nav>{nav.map((item, index) => <button key={item} className={`nav-item ${activePage === item ? 'selected' : ''}`} onClick={() => setActivePage(item)}><span className="nav-icon">{['◈', '◷', '▤', '⚙'][index]}</span>{item}</button>)}</nav>
        <div className="sidebar-bottom"><span className="online-dot"/><div><strong>Gemini assistant</strong><small>Notes and reminders saved locally</small></div></div>
      </aside>

      <main className="workspace">
        <header className="topbar"><div><span className="muted-label">YOUR WORKSPACE</span><h1>{activePage}</h1></div><div className="avatar" title="Jarvis AI">R</div></header>
        {activePage === 'Assistant' && <>
          <section className="conversation" aria-label="Conversation">
            {messages.length === 1 && <div className="welcome"><div className="orb"><span>J</span></div><span className="muted-label">YOUR PERSONAL ASSISTANT</span><h2>What can I help with?</h2><p>Think, plan, and get things done — all from your desktop.</p><div className="suggestions">{suggestions.map((item) => <button key={item} onClick={() => void send(item)}>{item}<span>↗</span></button>)}</div></div>}
            {messages.length > 1 && <div className="message-list">{messages.map((message) => <article key={message.id} className={`message ${message.role}`}><div className="message-avatar">{message.role === 'assistant' ? 'J' : 'R'}</div><div><strong>{message.role === 'assistant' ? 'Jarvis' : 'You'}</strong><p>{message.text}</p></div></article>)}{isLoading && <article className="message assistant"><div className="message-avatar">J</div><div><strong>Jarvis</strong><p className="thinking">Thinking with Gemini…</p></div></article>}<div ref={endRef}/></div>}
          </section>
          <form className="composer" onSubmit={submitChat}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onComposerKeyDown} placeholder="Message Jarvis…" rows={2} aria-label="Message Jarvis" disabled={isLoading}/><div className="composer-footer"><span>{voiceStatus || 'Enter to send · Shift + Enter for a new line'}</span><div><button type="button" className="icon-button" onClick={startVoice} aria-label="Start voice input" title="Voice input" disabled={isLoading}>♩</button><button type="submit" className="send-button" disabled={!draft.trim() || isLoading} aria-label="Send message">{isLoading ? '…' : '↑'}</button></div></div></form>
          <p className="disclaimer">Gemini responses; local notes, reminders, and memory stay on this device.</p>
        </>}
        {activePage === 'Reminders' && <section className="feature-page"><div className="feature-heading"><div><span className="muted-label">STAY ON TRACK</span><h2>Your reminders</h2></div><span className="count-badge">{reminders.filter((item) => !item.done).length} open</span></div>
          <form className="feature-form" onSubmit={addReminder}><label>Reminder<input value={reminderTitle} onChange={(event) => setReminderTitle(event.target.value)} placeholder="What should Jarvis remind you about?" maxLength={160} required /></label><label>When<input type="datetime-local" value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} required /></label><button className="send-button" type="submit" aria-label="Add reminder">＋</button></form>
          {reminders.length === 0 ? <div className="empty-state">No reminders yet. Add one above to get started.</div> : <div className="item-list">{reminders.map((item) => <article className={`saved-item ${item.done ? 'completed' : ''}`} key={item.id}><input type="checkbox" checked={item.done} onChange={() => setReminders((current) => current.map((reminder) => reminder.id === item.id ? { ...reminder, done: !reminder.done } : reminder))} aria-label={`Mark ${item.title} complete`} /><div className="saved-item-content"><strong>{item.title}</strong><small>{formatDate(item.dueAt)}</small></div><button className="delete-button" onClick={() => setReminders((current) => current.filter((reminder) => reminder.id !== item.id))} aria-label={`Delete ${item.title}`}>×</button></article>)}</div>}
        </section>}
        {activePage === 'Notes' && <section className="feature-page"><div className="feature-heading"><div><span className="muted-label">YOUR PRIVATE SCRATCHPAD</span><h2>Notes</h2></div><span className="count-badge">{notes.length} saved</span></div>
          <form className="note-form" onSubmit={addNote}><input value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} placeholder="Note title" maxLength={120} aria-label="Note title"/><textarea value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="Write a note to keep on this device…" rows={3} maxLength={5000} aria-label="Note content"/><button className="action-button" type="submit">Save note</button></form>
          {notes.length === 0 ? <div className="empty-state">Your saved notes will appear here.</div> : <div className="item-list">{notes.map((note) => <article className="saved-item note-item" key={note.id}><div className="saved-item-content"><strong>{note.title}</strong><small>{formatDate(note.createdAt)}</small><p>{note.body || 'No note text.'}</p></div><button className="delete-button" onClick={() => setNotes((current) => current.filter((entry) => entry.id !== note.id))} aria-label={`Delete ${note.title}`}>×</button></article>)}</div>}
        </section>}
        {activePage === 'Settings' && <section className="feature-page settings-page"><div className="feature-heading"><div><span className="muted-label">PERSONALIZATION</span><h2>Jarvis memory</h2></div></div><p className="settings-copy">Add preferences or context you want Jarvis to include with chat requests. This text is stored in this browser profile and sent to the configured Gemini API when you chat. Avoid sensitive information.</p><label className="memory-label" htmlFor="memory">Things Jarvis should remember</label><textarea id="memory" className="memory-input" value={memory} onChange={(event) => setMemory(event.target.value)} placeholder="For example: I prefer concise answers and work in Pacific time." maxLength={2000} rows={7}/><div className="privacy-hint">Saved automatically on this device · {memory.length}/2000 characters</div><button className="text-button" onClick={() => { setMemory(''); localStorage.removeItem('jarvis.memory'); }}>Clear memory <span>×</span></button></section>}
      </main>
    </div>
  );
}
