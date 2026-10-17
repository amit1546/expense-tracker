import { useRef, useState } from 'react';
import { backupFilename, makeBackup, parseBackup } from '../lib/backup.js';
import { todayISO } from '../lib/format.js';
import { saveTextFile } from '../lib/files.js';

// data: { expenses, recurring, budgets }; onRestore(parsed) replaces everything; notify(text) shows a toast
export default function BackupCard({ data, onRestore, notify }) {
  const fileRef = useRef(null);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');

  const save = async () => {
    setError('');
    const result = await saveTextFile(backupFilename(todayISO()), makeBackup(data));
    if (result === 'saved') notify('הגיבוי נשמר');
    else if (result === 'unavailable') setError('שמירת קבצים לא זמינה כאן');
  };

  const choose = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try {
      setPending(parseBackup(await file.text()));
    } catch (err) {
      setPending(null);
      setError(err.message);
    }
  };

  return (
    <div className="backup">
      <h2>גיבוי הנתונים</h2>
      <div className="actions">
        <button className="secondary" onClick={save}>
          שמירת גיבוי
        </button>
        <button className="secondary" onClick={() => fileRef.current?.click()}>
          שחזור מגיבוי
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={choose} />
      </div>
      {pending && (
        <p className="confirm-row">
          לשחזר {pending.expenses.length} הוצאות ו-{pending.recurring.length} הוצאות קבועות? הנתונים הנוכחיים יוחלפו.
          <button
            className="link danger"
            onClick={() => {
              onRestore(pending);
              setPending(null);
            }}
          >
            שחזור
          </button>
          <button className="link" onClick={() => setPending(null)}>
            ביטול
          </button>
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
