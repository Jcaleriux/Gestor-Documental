function DashboardNotes({ notes }) {
  return (
    <div className="dashboard-note-list">
      {notes.map((note) => (
        <div className="dashboard-note-item" key={note}>{note}</div>
      ))}
    </div>
  );
}

export default DashboardNotes;
