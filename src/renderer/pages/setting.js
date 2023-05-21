import { Descriptions, Divider, Table, message, Button, Modal, Tabs, Form, Input } from 'antd';
import { useState, useMemo, useEffect } from 'react';
import { selector, atom, useRecoilState, useRecoilRefresher_UNSTABLE } from 'recoil';
import { useRecoilValueMemo } from 'recoil-enhance';
import FileSelector from '../components/file-selector';
import AsyncButton from '../components/button';
import { invoke } from '../utils';


function DirectoryInputInternal({ value, onChange }) {
  const [count,setCount] = useState(-1);
  const takeDirectory = () => {
    return invoke('takeDirectory').then(({ pathName }) => {
      if (pathName && pathName.length) {
        onChange(pathName[0]);
      }
    });
  }

  useEffect(() => {
    if (value) {
      invoke('getFilesCount', { directory: value }).then(({ count }) => {
        setCount(count);
      });
    }
  }, [value]);
  return (
    <div onClick={takeDirectory} className="inline-flex items-center">
      { value || <Button type="primary">take</Button> }
      <span className="ml-2">file nums: { count }</span>
    </div>
  )
}
function DirectoryInput({ name, className }) {
  const [count, setCount] = useState(-1);

  return (
    <div className={className}>
      <Form.List name={name}>
        {
          (fields, operation) => {
            return (
              <div>
                {
                  fields.map((field, index) => {
                    return (
                      <div key={field.key} className="h-[40px] flex items-center">
                        <Form.Item label={`path${index + 1}`}>
                          <Form.Item name={[index, "pathName"]} noStyle>
                            <DirectoryInputInternal />
                          </Form.Item>
                          <Button onClick={() => operation.remove(index)}>delete</Button>
                          <span className="text-blue-300 ml-2 font-bold inline-flex">
                            {
                              (() => {
                                if (count === -1) {
                                  return '';
                                }
                                return `${count} files`;
                              })()
                            }
                          </span>
                        </Form.Item>
                      </div>
                    )
                  })
                }
                <Button className="cursor-pointer" onClick={() => operation.add({ pathName: ''})}>Add</Button>
              </div>
            );
          }
        }
      </Form.List>
    </div>
  );
}

const basicSettingAtom = atom({
  key: 'basic setting atom',
  default: selector({
    key: 'basic setting default',
    get: () => {
      return invoke('getConfig', { configName: 'basicSetting'});
    }
  })
});


const advanceSettingAtom = atom({
  key: 'advance setting atom',
  default: selector({
    key: 'advance setting default',
    get: () => {
      return invoke('getConfig', { configName: 'advanceSetting'});
    }
  })
});


export default function Setting({ show, onClose }) {
  const basicSetting = useRecoilValueMemo(basicSettingAtom);
  const advanceSetting = useRecoilValueMemo(advanceSettingAtom);
  const refreshBasic = useRecoilRefresher_UNSTABLE(basicSettingAtom);
  const refreshAdvance = useRecoilRefresher_UNSTABLE(advanceSettingAtom);

  const [DBPreviewList, setDBPreviewList] = useState(null);
  const [DBPreviewColumn, setPreviewColumn] = useState([]);

  const [DBFileName, setDBFileName] = useState('');
  const [processing, setProcessing] = useState(false);

  const items = useMemo(() => {
    const onSubmitBasic = (formData) => {
      return invoke('saveBasicConfig', {
        value: formData
      }).then(() => {
        refreshBasic();
        onClose();
      }).catch(error => {
        message.error(error.message);
      })
    };

    const onImportDatabase = (dbFile) => {
      if (dbFile) {
        setDBPreviewList(null);
        invoke('parseDBSchema', {
          fileName: dbFile
        }).then(({ data }) => {
          setDBFileName(dbFile);
          setPreviewColumn(Object.keys(data[0]).map((key, index) => {
            return {
              title: key,
              dataIndex: key,
              key: index
            }
          }));
          setDBPreviewList(data);
        })
      }
    };

    const onImportToInternal = () => {
      setProcessing(true);
      message.loading({
        content: 'processing...',
        duration: 0,
        key: 'process loading'
      });
      invoke('importDBToInternal', {
        fileName: DBFileName
      }, ({ progress }) => {
        message.loading({
          content: `processing... ${progress}%`,
          duration: 0,
          key: 'process loading'
        });
      }).then(() => {
      }).catch((error) => {
        message.error({ content: error.message });
      }).finally(() => {
      });
    }

    const onOpenLocalDB = () => {
      invoke('openLocalDB');
    }

    return [
      {
        label: 'Basic',
        key: '1',
        children: (
          <Form onFinish={onSubmitBasic} initialValues={basicSetting}>
            <DirectoryInput name="directorys" />

            <div className="mt-[40px]">
              <Button type="primary" htmlType="submit"> Save</Button>
              <Button className="ml-2" onClick={onClose}>Close</Button>
            </div>
          </Form>



        )
      },
      {
        label: 'Advance',
        key: '2',
        children: (
          <div>
            <Descriptions title="Database schema and tableName" bordered layout="vertical">
              <Descriptions.Item label="Select File">
                <FileSelector filtersType="sqlite3" title="select sqlite3 database file" allowMultiple={false} onChange={onImportDatabase} >
                  <Button>
                    add database
                  </Button>
                </FileSelector>
              </Descriptions.Item>
              <Descriptions.Item label="tableName">
                gallery
              </Descriptions.Item>
              <Descriptions.Item label="reference" span={2}>
                https://sukebei.nyaa.si/view/3812785
              </Descriptions.Item>
            </Descriptions>

            <div className="my-2">
              Preview in the below: and
              <Button type="primary" className="ml-2" disabled={!DBPreviewList} onClick={onImportToInternal}>Confirm & Import</Button>
              <Button onClick={onOpenLocalDB}>Open local db</Button>
            </div>
            {
              DBPreviewList && (
                <Table scroll={{ x: 9000, y: 300}} dataSource={DBPreviewList} columns={DBPreviewColumn} size="small" />
              )
            }
            <Divider />

          </div>
        )
      }
    ]
  }, [DBPreviewList, DBPreviewColumn]);

  return (
    <Modal open={show} onCancel={onClose} title="Setting" footer={null} width={1000}>
      <Tabs defaultActiveKey="1" items={items} />
    </Modal>
  );
}
