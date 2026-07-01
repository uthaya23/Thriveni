const normalizeDate = (dateStr) => {
  if (!dateStr) return dateStr;
  if (typeof dateStr === 'string' && dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      let [p1, p2, year] = parts;
      if (year.length === 4) {
        // Assume DD/MM/YYYY since it's the standard for this dataset
        return `${year}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}T00:00:00.000Z`;
      }
    }
  }
  return dateStr;
};

console.log(normalizeDate("28/4/2026"));
console.log(normalizeDate("5/9/2025"));
console.log(normalizeDate("2026-05-15"));
