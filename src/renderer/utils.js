/* eslint-disable */
import isElectron from 'is-electron';
import qrCode from 'qrcode';
import ReactDOM from 'react-dom';
import { Modal } from 'antd';
import shareConfig from '../main/config';

const HOST = '192.168.3.31';
export function imgUrl(fileName, cover) {
  return `http://${HOST}:${
    shareConfig.PORT
  }/api/img?fileName=${encodeURIComponent(fileName)}&cover=${encodeURIComponent(
    cover
  )}`;
}
export function showQrModal(pathName) {
  const canvas = document.createElement('canvas');
  let div = document.createElement('div');
  document.body.appendChild(div);
  const onCancel = () => {
    if (div) {
      ReactDOM.unmountComponentAtNode(div);
      document.body.removeChild(div);
      div = null;
    }
  };

  invoke('getLocalNetwork').then((data) => {
    console.log(data);
    Promise.all(
      Object.keys(data).map((nName) => {
        return new Promise((resolve) => {
          qrCode.toDataURL(
            `http://` + data[nName][0] + ':' + shareConfig.PORT + (pathName || ''),
            function (_, url) {
              resolve({ nName, url });
            }
          );
        });
      })
    ).then((list) => {
      ReactDOM.render(
        <Modal open={true} onCancel={onCancel} onOk={onCancel}>
          {list.map(({ nName, url }) => {
            return (
              <div key={nName}>
                {nName}
                <img src={url}></img>
              </div>
            );
          })}
        </Modal>,
        div
      );
    });
  });
}

export function invoke(methodName, params, progressCallback) {
  let host = '';
  if (isElectron) {
    host = `http://${HOST}:${shareConfig.PORT}`;
  } else {
    host = '';
  }
  return fetch(`${host}/api/msg`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: methodName,
      params,
    }),
  })
    .then((resp) => {
      if (resp.status !== 200) {
        return new Promise((resolve) => {
          resolve(resp.json());
        }).then((data) => {
          throw data;
        });
      }
      return resp.json();
    })
    .then((data) => {
      if (data.isTask && progressCallback) {
        return new Promise((resolve, reject) => {
          queryTask(data.taskId, (taskStatus) => {
            progressCallback(taskStatus);
            if (taskStatus.progress === 100) {
              if (taskStatus.error) {
                reject(new Error(taskStatus.error));
              } else {
                resolve(taskStatus.data);
              }
            }
          });
        });
      }
      return data;
    });
}

export function ping() {
  return invoke('ping', {
    hello: 'world',
  });
}

function queryTask(task, callback) {
  function doWork() {
    setTimeout(() => {
      invoke('queryTask', {
        taskId: task,
      }).then(({ progress, data, error }) => {
        if (progress !== 100) {
          callback({ progress, data, error });
          doWork();
        }
      });
    }, 1000);
  }

  doWork();
}
