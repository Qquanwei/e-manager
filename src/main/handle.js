import Store from 'electron-store';
import buildDebug from 'debug';
import path from 'path';
import imageSize from 'image-size';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { shell, app, dialog, BrowserWindow } from 'electron';
import * as z7 from './7z';
import * as network from './network';

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
      thenable
        .then(() => {
          handle.updateTask(currentTaskId, 100, value);
        })
        .catch((error) => {
          handle.updateTask(currentTaskId, 100, null, error.message);
        });
    }
    return {
      isTask: true,
      taskId: currentTaskId,
    };
  },

  updateTask(taskId, value, error) {
    // when task is done, cannot modify status
    if (!handle.taskMap[taskId] || handle.taskMap[taskId].progress !== 100) {
      handle.taskMap[taskId] = {
        progress: value,
        value,
        error,
      };
    }
  },

  queryTask({ taskId }) {
    return handle.taskMap[taskId];
  },

  getConfig({ configName }) {
    return store.get(configName) || {};
  },

  saveConfig({ configName, value }) {
    store.set(configName, value);
  },

  async saveBasicConfig({ value }) {
    const db = await handle.getInternalDB();
    const updateTime = Date.now();
    await Promise.all(
      (value.directorys || []).map(({ pathName }) => {
        return handle
          .getComicList(pathName)
          .then((fileNames) => {
            return Promise.all(
              fileNames.map(async (fileName) => {
                DEBUG('insert', fileName);

                const fullPath = path.resolve(pathName, fileName);
                if (
                  (
                    await db.get(
                      'select count(*) as cnt from comics where location = ? limit 1',
                      fullPath
                    )
                  ).cnt === 1
                ) {
                  return db.run(
                    'update comics set updateTime = ? where location = ?',
                    updateTime,
                    fullPath
                  );
                }
                const covers = await z7.getComicImgList(fullPath);
                const cover = covers[0];
                const { width, height } = imageSize(
                  await z7.getBuffer(
                    z7.getComicCoverFromBuffer(fullPath, cover)
                  )
                );
                // const width = 0;
                // const height = 1;
                return await db.run(
                  'INSERT INTO comics(title, location, cover, `group`, width, height, updateTime) values(?, ?, ?, ?, ?, ?, ?)',
                  [
                    path.basename(fileName, path.extname(fileName)),
                    path.resolve(pathName, fileName),
                    cover,
                    '',
                    width,
                    height,
                    updateTime,
                  ]
                );
              })
            );
          })
          .then(() => {
            return db.run(
              'DELETE from comics where updateTime != ?',
              updateTime
            );
          })
          .catch((error) => {
            console.log('error:', error);
            throw error;
            // just safe ignore
          });
      })
    );
    await handle.saveConfig({
      configName: 'basicSetting',
      value,
    });
  },

  // page from 0 to infinity
  async getComics({ page, pageSize, keyword }) {
    const db = await handle.getInternalDB();
    const whereQuery = `comics.title like \'%${
      keyword || ''
    }%\' or tags like \'%${keyword || ''}%\'`;

    const comics = await db.all(
      `select comics.* from comics left join gallery on comics.title = gallery.title where ` +
        whereQuery +
        ` limit ${pageSize} offset ${page * pageSize}`
    );
    const total = (
      await db.get(
        'select count(*) as cnt from comics left join gallery on comics.title = gallery.title where ' +
          whereQuery
      )
    ).cnt;
    return {
      comics,
      total,
      hasMore: total > pageSize * (page + 1),
    };
  },

  async getComicList(path) {
    return await new Promise((resolve, reject) => {
      fs.readdir(path, { withFileTypes: true }, (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(
            files
              .filter((f) => {
                if (f.isDirectory() || /\.(zip|rar|7z|tar)/i.test(f.name)) {
                  return true;
                }
                return false;
              })
              .map((file) => {
                return file.name;
              })
          );
        }
      });
    });
  },

  async takeDirectory() {
    const result = await dialog.showOpenDialog(
      BrowserWindow.getFocusedWindow(),
      {
        properties: ['openDirectory'],
      }
    );
    return {
      canceled: result.canceled,
      pathName: result.filePaths,
    };
  },

  async takeFile({ title, allowMultiple }) {
    const result = await dialog.showOpenDialog(
      BrowserWindow.getFocusedWindow(),
      {
        title,
        properties: [
          'openFile',
          allowMultiple ? 'multiSelections' : '',
          'dontAddToRecent',
        ],
      }
    );

    return {
      canceled: result.canceled,
      fileName: result.filePaths,
    };
  },

  async getFilesCount({ directory }) {
    return new Promise((resolve, reject) => {
      fs.readdir(directory, (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve({ count: files.length });
        }
      });
    });
  },

  async getFileList({ directory }) {
    return new Promise((resolve, reject) => {});
  },

  async parseDBSchema({ fileName }) {
    const db = await open({
      filename: fileName,
      driver: sqlite3.Database,
    });

    return {
      data: await db.all('select * from gallery limit 10'),
    };
  },

  // import external database to internal
  async importDBToInternal({ fileName }) {
    return handle.createTask(async (taskId) => {
      const external = await open({
        filename: fileName,
        driver: sqlite3.Database,
      });
      const internal = await handle.getInternalDB();

      DEBUG('db', 'import start');
      const { cnt } = await external.get('select count(*) as cnt from gallery');
      let doneCnt = 0;

      DEBUG('db', 'sqlite3 counts:', cnt);
      for (let i = 0; i < cnt; i += 1000) {
        handle.updateTask(taskId, Math.floor((doneCnt / cnt) * 100));
        await external.each(
          `select * from gallery limit 1000 offset ${i}`,
          async (err, row) => {
            doneCnt++;
            const line = [
              row.title,
              JSON.stringify({
                group: row.group,
                character: row.character,
                female: row.female,
                male: row.male,
                mixed: row.mixed,
                other: row.other,
                cosplayer: row.cosplayer,
                rest: row.rest,
                category: row.category,
                gid: row.gid,
              }),
              row.rating,
              row.filesize,
              row.filecount,
              row.artist,
            ];
            internal.run(
              'INSERT INTO gallery(title, tags, rating, filesize, filecount, artist) values(?,?,?,?,?,?)',
              line
            );
          }
        );
      }
    });
  },

  openLocalDir({ fileName }) {
    shell.showItemInFolder(fileName);
  },

  openLocalDB() {
    shell.showItemInFolder(app.getPath('userData'));
  },

  async getAllTags() {
    const db = await handle.getInternalDB();
    return {
      data: await db.all(
        'select * from comics inner join gallery on comics.title = gallery.title'
      ),
    };
  },

  async getInternalDB() {
    const basePath = path.resolve(app.getPath('userData'), 'db.sqlite');

    const db = await open({
      filename: basePath,
      driver: sqlite3.Database,
    });

    // group, rating
    await db.exec(
      'CREATE TABLE IF NOT EXISTS comics(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, location TEXT, cover TEXT, `group` TEXT,width INTEGER, height INTEGER, position INTEGER, updateTime INTEGER)'
    );
    await db.exec(
      `CREATE TABLE IF NOT EXISTS gallery ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "title" TEXT, "tags" TEXT, "rating" REAL, "filesize" INTEGER, "filecount" INTEGER, "artist" VARCHAR(255))`
    );
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_comics_title on comics(title)`
    );
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_gallery_title on gallery(title)`
    );
    await db.exec(
      `CREATE INDEX IF NOT EXISTS idx_gallery_artist on gallery(artist)`
    );
    await db.run('PRAGMA synchronous=OFF');
    await db.run('PRAGMA count_changes=OFF');
    await db.run('PRAGMA journal_mode=MEMORY');
    await db.run('PRAGMA temp_store=MEMORY');
    return db;
  },

  async getComicArchiveInfo({ fileName, id }) {
    let info = null;
    const db = await handle.getInternalDB();
    if (id) {
      info = await db.get(
        'select location, position, comics.title as title, gallery.tags as tags from comics left join gallery on comics.title = gallery.title where comics.id = ?',
        id
      );
    }
    if (fileName) {
      info = await db.get(
        'select location, comics.title as title, gallery.tags as tags from comics left join gallery on comics.title = gallery.title where title = ?',
        fileName
      );
    }
    const tags = (() => {
      try {
        return JSON.parse(info.tags);
      } catch {
        return null;
      }
    })();
    if (info) {
      return {
        ...info,
        tags,
        imgList: await z7.getComicImgList(info.location),
      };
    }
    throw new Error('comic not exists' + id + ' ' + title);
  },

  imgStream({ fileName, cover }) {
    return z7.getComicCoverFromBuffer(fileName, cover);
  },

  getLocalNetwork() {
    return network.getLocalNetwork();
  },

  async updateComicPosition({ id, position }) {
    const db = await handle.getInternalDB();
    return await db.run(
      'update comics set position = ? where id = ?',
      position,
      id
    );
  },
};

export default handle;
