import Koa from 'koa';
import Router from '@koa/router';
import koastatic from 'koa-static';
import bodyParser from 'koa-bodyparser';
import MIME from 'mime-types';
import path from 'path';
import cors from '@koa/cors';
import buildDebug from 'debug';
import config from './config';
import handle from './handle';

const DEBUG= buildDebug('server');

function server() {
  const app = new Koa();
  const router = new Router({ prefix: '/api'});

  // app start
  if (handle.APP_START) {
    handle.APP_START();
  }

  router.get('/img', async (ctx) => {
    const { fileName, cover } = ctx.request.query;
    DEBUG('img', fileName, cover);
    const stream = handle.imgStream({ fileName, cover });
    ctx.response.headers['Content-Type'] = MIME.lookup(cover);
    ctx.body = stream;
  });
  router.post('/msg', async (ctx) => {
    const { name, params } = ctx.request.body;
    DEBUG('name:', name, ctx.request.body);
    if (handle[name]) {
      try {
        const value = await handle[name](params);
        ctx.body = value || {
          message: 'ok'
        };
      } catch (error) {
        console.error(error);
        ctx.status = 400;
        ctx.body = {
          message: error.message
        };
      }
    } else {
      ctx.status = 404;
      DEBUG('method not exists:', name);
      ctx.body = {
        message: 'method not exists'
      };
    }
  });
  app.use(cors());
  app.use(bodyParser());
  app.use(router.routes());
  app.use(router.allowedMethods());
  app.use(koastatic(path.join(__dirname, '../renderer')));
  app.listen(config.PORT);
}

export default server;
