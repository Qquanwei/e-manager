import Store from 'electron-store';
import buildDebug from 'debug';
import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { shell, app, dialog, BrowserWindow } from 'electron';

sqlite3.verbose();
const DEBUG = buildDebug('handle');

let store = null;
let nextTaskId = Math.floor(Math.random() * 1000);

const handle = {
  // special lifecycle
  APP_START() {
    store = new Store();
  },

  // create a long time task , return taskId
  // and use queryTask can query this task status
  // use updateTask can update task by internal.
  createTask(callback) {
    if (!handle.taskMap) {
      handle.taskMap = {};
    }
    const currentTaskId = nextTaskId++;
    const thenable = callback(currentTaskId);
    if (thenable && typeof thenable.then === 'function') {
      thenable.then(() => {
        handle.updateTask(currentTaskId, 100, value);
      }).catch((error) => {
        handle.updateTask(currentTaskId, 100, null, error.message);
      })
    }
    return {
      isTask: true,
      taskId: currentTaskId
    };
  },

  updateTask(taskId, value, error) {
    // when task is done, cannot modify status
    if (!handle.taskMap[taskId] || handle.taskMap[taskId].progress !== 100) {
      handle.taskMap[taskId] = {
        progress: value,
        value,
        error
      };
    }
  },

  queryTask({ taskId }) {
    return handle.taskMap[taskId]
  },

  ping() {
    return {
      message: 'pong'
    };
  },
  getConfig({ configName }) {
    return store.get(configName) || {};
  },

  saveConfig({ configName, value}) {
    store.set(configName, value);
  },

  async saveBasicConfig({ value }) {
    const db = await handle.getInternalDB();
    try {
      await db.exec('DELETE from comics');
    } catch(error) {
      console.log('delete failed');
    }
    console.log('hello', value);
    await Promise.all((value.directorys || []).map(({ pathName }) => {
      return handle.getComicList(pathName).then((fileNames) => {
        console.log('->', fileNames);
        fileNames.map((fileName) => {
          DEBUG('insert', fileName);
          db.run(
            'INSERT INTO comics(title, location, cover, \`group\`) values(?, ?, ?, ?)',
            [fileName, path.resolve(pathName, fileName), '', '']
          );
        })
      }).catch((error) => {
        console.log('error:', error);
        // just safe ignore
        return null;
      })
    }));

    await handle.saveConfig({
      configName: 'basicSetting',
      value
    });
  },

  async getComicList(path) {
    return await new Promise((resolve, reject) => {
      fs.readdir(path, { withFileTypes: true }, (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files.filter(f => {
            if (f.isDirectory() || /\.(zip|rar|7z|tar)/i.test(f.name)) {
              return true;
            }
            return false;
          }).map(file => {
            return file.name;
          }));
        }
      })
    });
  },

  async takeDirectory() {
    const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
      properties: ['openDirectory']
    });
    return {
      canceled: result.canceled,
      pathName: result.filePaths
    };
  },

  async takeFile({ title, allowMultiple }) {
    const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
      title,
      properties: ['openFile', allowMultiple ? 'multiSelections' : '', 'dontAddToRecent']
    });

    return {
      canceled: result.canceled,
      fileName: result.filePaths
    }
  },

  async getFilesCount({ directory }) {
    return new Promise((resolve ,reject) => {
      fs.readdir(directory, (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve({ count: files.length });
        }
      })
    });
  },

  async getFileList({ directory }) {
    return new Promise((resolve, reject) => {
    });
  },

  async parseDBSchema({ fileName }) {
    const db = await open({
      filename: fileName,
      driver: sqlite3.Database
    });

    return {
      data: await db.all('select * from gallery limit 10')
    }
  },

  // import external database to internal
  async importDBToInternal({ fileName }) {
    return handle.createTask(async (taskId) => {
      const external = await open({
        filename: fileName,
        driver: sqlite3.Database
      });
      const internal = await handle.getInternalDB();

      DEBUG('db', 'import start');
      const { cnt } = await external.get('select count(*) as cnt from gallery');
      let doneCnt = 0;

      DEBUG('db', 'sqlite3 counts:', cnt);
      for (let i = 0; i < cnt; i += 1000) {
        const ary = [];
        handle.updateTask(taskId, Math.floor(doneCnt / cnt * 100));
        await external.each(`select * from gallery limit 1000 offset ${i}`, async (err, row) => {
          doneCnt ++;
          const line = [
            row.title,
            JSON.stringify({
              group: row.group ,
              character: row.character,
              female: row.female,
              male: row.male,
              mixed: row.mixed,
              other: row.other,
              cosplayer: row.cosplayer,
              rest: row.rest,
              category: row.category,
              gid: row.gid
            }),
            row.rating,
            row.filesize,
            row.filecount,
            row.artist
          ];
          internal.run(
            'INSERT INTO gallery(title, tags, rating, filesize, filecount, artist) values(?,?,?,?,?,?)',
            line
          );
        });
      }
    });
  },

  openLocalDB() {
    shell.showItemInFolder(app.getPath('userData'));
  },

  async getInternalDB() {
    const basePath = path.resolve(app.getPath('userData'), 'db.sqlite');


    const db = await open({
      filename: basePath,
      driver: sqlite3.Database
    });

    // group, rating
    await db.exec('CREATE TABLE IF NOT EXISTS comics(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, location TEXT, cover TEXT, \`group\` TEXT)');
    await db.exec(`CREATE TABLE IF NOT EXISTS gallery ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "title" TEXT, "tags" TEXT, "rating" REAL, "filesize" INTEGER, "filecount" INTEGER, "artist" VARCHAR(255))`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_comics_title on comics(title)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_gallery_title on gallery(title)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_gallery_artist on gallery(artist)`);
    await db.run('PRAGMA synchronous=OFF')
    await db.run('PRAGMA count_changes=OFF')
    await db.run('PRAGMA journal_mode=MEMORY')
    await db.run('PRAGMA temp_store=MEMORY')
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_gallery_group on gallery(\`group\`)`);
    return db;
  },
}

export default handle;
