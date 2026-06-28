(async () => {
  try {
    const res = await fetch('http://localhost:5005/api/qa/6a4000b5b3f0979e8c8c8ceb');
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Data:", data);
  } catch (err) {
    console.error("ERROR:", err);
  }
})();
