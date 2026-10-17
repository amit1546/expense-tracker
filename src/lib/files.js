// Saves a text file. Inside the claude.ai viewer pages may not download directly, so the `downloads`
// capability is used (the viewer confirms); on a regular site a normal download link works.
// Resolves 'saved' | 'declined' | 'unavailable'.
export async function saveTextFile(filename, text) {
  const claude = globalThis.claude;
  if (claude?.use) {
    const downloads = await claude.use('downloads');
    if (!downloads) return 'unavailable';
    try {
      await downloads.save({ filename, data: text });
      return 'saved';
    } catch (err) {
      return err?.code === 'declined' ? 'declined' : 'unavailable';
    }
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000); // revoking at once cancels the download in some browsers
  return 'saved';
}
