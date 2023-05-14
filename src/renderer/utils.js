import isElectron from 'is-electron';
import shareConfig from '../main/config';

export function invoke(methodName, params, progressCallback) {
  let host = '';
  if (isElectron) {
    host = `http://localhost:${shareConfig.PORT}`;
  } else {
    host = ''
  };
  return fetch(`${host}/api/msg`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: methodName,
      params
    })
  }).then(resp => {
    if (resp.status !== 200) {
      return new Promise(resolve => {
        resolve(resp.json());
      }).then(data => {
        throw data;
      });
    }
    return resp.json();
  }).then((data) => {
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
    hello: 'world'
  });
}


function queryTask(task, callback) {
  function doWork() {
    setTimeout(() => {
      invoke('queryTask', {
        taskId: task
      }).then(({ progress, data, error }) => {
        if (progress !== 100) {
          callback({ progress, data, error })
          doWork();
        }
      })
    }, 1000);
  }

  doWork();
}
