import { exec, spawn } from 'node:child_process';
import path from 'path';
import fs from 'fs';
import * as R from 'ramda';
import { app } from 'electron';
import { getAssetPath } from './util';

const CACHE_DIR = path.resolve(app.getPath('userData'), 'comic-cache');


function exec7ZBuffer(...params) {
  const child = spawn(getAssetPath('7z.exe'), params);

  child.on('close', code => {
    if (code != 0) {

    console.log('error', getAssetPath('7z.exe'), params)
      const err = new Error();
      err.code = code;
      console.error(err);
    }
  });

  return child.stdout;

}

function exec7Z(...params) {
  return new Promise((resolve, reject) => {
    const child = spawn(getAssetPath('7z.exe'), ['-sccUTF-8'].concat(params));
    const out = [];
    const errs = [];
    child.stdout.on('data', (data) => {
      out.push(data.toString());
    });
    child.stderr.on('data', (data) => {
      errs.push(data.toString());
    });

    child.on('close', code => {
      if (code === 0) {
        resolve(out.join('').replace(/\r/g, '').split('\n'));
      } else {
        const err = new Error();
        err.code = code;
        err.message = errs.join('');
        reject(err);
      }
    });
  });
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR);
  }
}

// 获取文件封面，以及解压到缓存
// 需要单元测试，和7z耦合
// eslint-disable-next-line import/prefer-default-export
export async function getComicImgList(comicFileName, cache = true) {
  if (cache) {
    ensureCacheDir();
  }

  const datas = await exec7Z('l', comicFileName);

  let start = 15;
  for (let i = 0; i < datas.length; ++i) {
    if (/----------/.test(datas[i])) {
      start = i + 1;
      break;
    }
  }

  return datas.slice(start, -3).map((line) => {
    return line.split(' ').slice(-1)[0];
  }).sort((a, b) => {
    return Number(a.replace(/[^\d]*/g, '')) - Number(b.replace(/[^\d]*/g, ''));
  });
}

export function getComicCoverFromBuffer(comicFileName, coverName) {
  return exec7ZBuffer('e', comicFileName, '-so', coverName);
}

export async function getBuffer(readStream) {
  return new Promise(resolve => {
    const bufs = [];
    readStream.on('data', data => {
      bufs.push(data);
    });
    readStream.on('end', () => {
      resolve(Buffer.concat(bufs));
    });
  });
}
