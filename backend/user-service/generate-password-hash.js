const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'admin123';
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  console.log(hash);
}

generateHash();
