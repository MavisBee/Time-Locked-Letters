import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Trash2, Send } from 'lucide-react';

interface Letter {
  id: string;
  recipient: string;
  content: string;
  unlockDate: string; // ISO string
}

function App() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [recipient, setRecipient] = useState('');
  const [content, setContent] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const saved = localStorage.getItem('timeLockedLetters');
    if (saved) {
      setLetters(JSON.parse(saved));
    }
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const saveLetters = (newLetters: Letter[]) => {
    setLetters(newLetters);
    localStorage.setItem('timeLockedLetters', JSON.stringify(newLetters));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipient || !content || !unlockDate) return;

    const newLetter: Letter = {
      id: crypto.randomUUID(),
      recipient,
      content,
      unlockDate: new Date(unlockDate).toISOString(),
    };

    saveLetters([...letters, newLetter]);
    setRecipient('');
    setContent('');
    setUnlockDate('');
  };

  const handleDelete = (id: string) => {
    saveLetters(letters.filter(l => l.id !== id));
  };

  const calculateTimeLeft = (unlockDateStr: string) => {
    const unlock = new Date(unlockDateStr).getTime();
    const current = now.getTime();
    const diff = unlock - current;

    if (diff <= 0) return null;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <div className="min-h-screen p-8 max-w-5xl mx-auto">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-light tracking-widest text-white mb-4">TIME-LOCKED LETTERS</h1>
        <p className="text-slate-400 font-light">Patience as a product. A place where letters sleep until their time comes.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="glass-panel rounded-2xl p-6 sticky top-8">
            <h2 className="text-xl font-medium mb-6 flex items-center gap-2">
              <Send size={20} className="text-indigo-400" />
              Seal a Letter
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Recipient</label>
                <input 
                  type="text" 
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Who is this for?"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Unlock Date & Time</label>
                <input 
                  type="datetime-local" 
                  value={unlockDate}
                  onChange={(e) => setUnlockDate(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 transition-colors [color-scheme:dark]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">The Message</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-white h-32 resize-none focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Write your confession, reminder, or note to the future..."
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
              >
                Lock Letter
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {letters.length === 0 ? (
            <div className="text-center py-20 text-slate-500 border border-dashed border-slate-700 rounded-2xl">
              No locked letters yet. The vault is empty.
            </div>
          ) : (
            letters.map(letter => {
              const timeLeft = calculateTimeLeft(letter.unlockDate);
              const isLocked = timeLeft !== null;

              return (
                <div key={letter.id} className="glass-panel rounded-2xl p-6 relative overflow-hidden group animate-fade-in">
                  <button 
                    onClick={() => handleDelete(letter.id)}
                    className="absolute top-4 right-4 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete letter"
                  >
                    <Trash2 size={18} />
                  </button>

                  <div className="flex items-start gap-4 mb-4">
                    <div className={`p-3 rounded-full ${isLocked ? 'bg-slate-800 text-slate-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                      {isLocked ? <Lock size={24} /> : <Unlock size={24} />}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">To: {letter.recipient}</h3>
                      <p className="text-sm text-slate-400">
                        Set to open: {new Date(letter.unlockDate).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className={`mt-4 rounded-xl p-4 border ${isLocked ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-800/40 border-indigo-500/30'}`}>
                    {isLocked ? (
                      <div className="text-center py-6">
                        <div className="text-sm text-slate-500 mb-2 uppercase tracking-wider font-semibold">Unlocks in</div>
                        <div className="text-2xl font-mono text-indigo-300 font-light tracking-tight">{timeLeft}</div>
                      </div>
                    ) : (
                      <div className="animate-fade-in">
                        <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {letter.content}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
