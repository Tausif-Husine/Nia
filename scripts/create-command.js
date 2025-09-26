// Usage: node scripts/create-command.js fun newcmd
const fs = require('fs');
const path = require('path');

const [,, folder='misc', name='newcommand'] = process.argv;
const dir = path.join(__dirname, '..', 'src', 'commands', folder);

if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const file = path.join(dir, `${name}.js`);
if (fs.existsSync(file)) {
  console.error('Command already exists:', file);
  process.exit(1);
}

const template = `module.exports = {
  name: '${name}',
  description: 'Describe ${name}',
  options: [],
  async execute(ctx, client, args = []) {
    await ctx.reply('Hello from ${name}! Args: ' + JSON.stringify(args));
  }
};
`;

fs.writeFileSync(file, template);
console.log('Created', file);
