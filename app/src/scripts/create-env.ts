const fs = require('fs')
fs.writeFileSync('../../.env', `IDL=${process.env.IDL}\n`)