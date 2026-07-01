fetch("http://localhost:3000/api/dashboard")
  .then(res => res.text())
  .then(console.log)
  .catch(console.error);
