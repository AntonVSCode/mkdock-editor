self.onmessage = (e) => {
  try {
    const data = JSON.parse(e.data);
    postMessage(data);
  } catch (err) {
    postMessage({ error: err.message });
  }
};