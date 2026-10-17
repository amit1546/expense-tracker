export default function BackupReminder({ status, onBackup, onSnooze }) {
  return (
    <div className="reminder" role="status">
      <span>{status.never ? 'עוד לא גיבית את הנתונים' : `עברו ${status.days} ימים מהגיבוי האחרון`}</span>
      <span className="actions">
        <button onClick={onBackup}>גיבוי עכשיו</button>
        <button className="secondary" onClick={onSnooze}>
          הזכר לי בעוד שבוע
        </button>
      </span>
    </div>
  );
}
