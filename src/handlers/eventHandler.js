const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

module.exports = (client) => {
  const eventsPath = path.join(__dirname, '..', 'events');
  const boundListeners = new Map();

  function listFiles(dir) {
    const files = [];
    for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
      const res = path.join(dir, dirent.name);
      if (dirent.isDirectory()) files.push(...listFiles(res));
      else if (dirent.isFile() && dirent.name.endsWith('.js')) files.push(res);
    }
    return files;
  }

  async function loadEvents() {
    for (const [name, listener] of boundListeners) {
      client.removeListener(name, listener);
    }
    boundListeners.clear();

    const files = listFiles(eventsPath);
    for (const f of files) {
      try {
        delete require.cache[require.resolve(f)];
        const evt = require(f);

        if (!evt || !evt.name || typeof evt.execute !== 'function') {
          console.warn(`Skipping invalid event file: ${f}`);
          continue;
        }

        const listener = (...args) => evt.execute(...args, client);

        if (evt.once) client.once(evt.name, listener);
        else client.on(evt.name, listener);

        boundListeners.set(evt.name, listener);
      } catch (err) {
        console.error(`Failed loading event ${f}:`, err);
      }
    }

    console.log(`Loaded ${boundListeners.size} events.`);
  }

  function watchEvents() {
    const watcher = chokidar.watch(eventsPath, { ignoreInitial: true });
    let timeout = null;
    const doReload = async () => {
      try {
        await loadEvents();
        console.log('Hot-reloaded events.');
      } catch (err) {
        console.error('Event hot-reload failed:', err);
      }
    };
    watcher.on('all', () => {
      clearTimeout(timeout);
      timeout = setTimeout(doReload, 250);
    });
    return watcher;
  }

  return {
    loadEvents,
    watchEvents
  };
};
