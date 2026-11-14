import { useEffect, useRef, useState } from 'react';

type Message = { id: string; role: 'assistant' | 'user'; text: string };
type SpeechWindow = Window & { webkitSpeechRecognition?: new () => SpeechRecognition };
type SpeechRecognition = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

const initialMessages: Message[] = [
  { id: 'welcome', role: 'assistant', text: 'Good to see you. I’m Jarvis, your personal assistant. What would you like to work on?' }
];
const suggestions = ['Plan my day', 'Help me focus', 'Capture a note'];
const apiUrl = import.meta.env.VITE_JARVIS_API_URL ?? 'http://127.0.0.1:8787';

export default function App() {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('jarvis.messages');
      return saved ? JSON.parse(saved) as Message[] : initialMessages;
    } catch {
      return initialMessages;
    }
  });
  const [draft, setDraft] = useState('');
  const [activePage, setActivePage] = useState('Assistant');
  const [voiceStatus, setVoiceStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('jarvis.messages', JSON.stringify(messages));
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(text = draft) {
    const prompt = text.trim();
    if (!prompt || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: 'user', text: prompt };
    const history = [...messages, userMessage]
      .filter((message) => message.id !== 'welcome')
      .slice(-20)
      .map(({ role, text: messageText }) => ({ role, text: messageText }));

    setMessages((current) => [...current, userMessage]);
    setDraft('');
    setIsLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });
      const result = await response.json() as { text?: string; error?: string };
      if (!response.ok) throw new Error(result.error || `Gemini request failed (${response.status})`);
      if (!result.text) throw new Error('Gemini returned an empty response.');
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: result.text! }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not reach the Jarvis API.';
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: `I couldn’t get a response from Gemini. ${message}` }]);
    } finally {
      setIsLoading(false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    void send();
  }

  function onComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  function startVoice() {
    const SpeechRecognitionCtor = (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setVoiceStatus('Voice input is not supported by this system webview.');
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setDraft((current) => current ? `${current} ${transcript}` : transcript);
    };
    recognition.onerror = () => setVoiceStatus('Could not access voice input. Check microphone permissions.');
    recognition.onend = () => setVoiceStatus('');
    setVoiceStatus('Listening…');
    recognition.start();
  }

  const nav = ['Assistant', 'Reminders', 'Notes', 'Settings'];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-icon">J</div><div><span className="muted-label">PERSONAL AI</span><strong>Jarvis</strong></div></div>
        <button className="new-chat" onClick={() => setMessages(initialMessages)}><span>＋</span> New conversation</button>
        <div className="nav-label">WORKSPACE</div>
        <nav>{nav.map((item, index) => <button key={item} className={`nav-item ${activePage === item ? 'selected' : ''}`} onClick={() => setActivePage(item)}><span className="nav-icon">{['◈', '◷', '▤', '⚙'][index]}</span>{item}</button>)}</nav>
        <div className="sidebar-bottom"><span className="online-dot"/><div><strong>Ready when you are</strong><small>Desktop app · Local chat history</small></div></div>
      </aside>

      <main className="workspace">
        <header className="topbar"><div><span className="muted-label">YOUR WORKSPACE</span><h1>{activePage}</h1></div><div className="avatar" title="Jarvis AI">R</div></header>
        {activePage === 'Assistant' ? <>
          <section className="conversation" aria-label="Conversation">
            {messages.length === 1 && <div className="welcome"><div className="orb"><span>J</span></div><span className="muted-label">YOUR PERSONAL ASSISTANT</span><h2>What can I help with?</h2><p>Think, plan, and get things done — all from your desktop.</p><div className="suggestions">{suggestions.map((item) => <button key={item} onClick={() => void send(item)}>{item}<span>↗</span></button>)}</div></div>}
            {messages.length > 1 && <div className="message-list">{messages.map((message) => <article key={message.id} className={`message ${message.role}`}><div className="message-avatar">{message.role === 'assistant' ? 'J' : 'R'}</div><div><strong>{message.role === 'assistant' ? 'Jarvis' : 'You'}</strong><p>{message.text}</p></div></article>)}{isLoading && <article className="message assistant"><div className="message-avatar">J</div><div><strong>Jarvis</strong><p className="thinking">Thinking with Gemini…</p></div></article>}<div ref={endRef}/></div>}
          </section>
          <form className="composer" onSubmit={submit}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onComposerKeyDown} placeholder="Message Jarvis…" rows={2} aria-label="Message Jarvis"/><div className="composer-footer"><span>{voiceStatus || 'Enter to send · Shift + Enter for a new line'}</span><div><button type="button" className="icon-button" onClick={startVoice} aria-label="Start voice input" title="Voice input">♩</button><button type="submit" className="send-button" disabled={!draft.trim() || isLoading} aria-label="Send message">{isLoading ? '…' : '↑'}</button></div></div></form>
          <p className="disclaimer">Responses are generated by Google Gemini. Verify important information.</p>
        </> : <section className="placeholder"><div className="placeholder-icon">{activePage === 'Notes' ? '▤' : activePage === 'Reminders' ? '◷' : '⚙'}</div><h2>{activePage}</h2><p>This workspace is ready for the next feature. Your chat is available in Assistant.</p><button className="text-button" onClick={() => setActivePage('Assistant')}>Back to Assistant <span>→</span></button></section>}
      </main>
    </div>
  );
}
