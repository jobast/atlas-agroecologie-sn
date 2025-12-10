const bcrypt = require('bcrypt');

bcrypt.hash(‘Redisdead2', 10).then(hash => {
  console.log('Hash généré :', hash);
});
