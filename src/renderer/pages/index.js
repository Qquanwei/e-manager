// index page
import { selector, atom, useRecoilState } from 'recoil';
import { useCallback, useState } from 'react';
import { SettingOutlined } from '@ant-design/icons';
import { Container } from 'antd';

import Button from '../components/button';
import Input from '../components/input';
import Setting from './setting';
import * as utils from '../utils';

function Index() {
  const [showSetting, setShowSetting] = useState(false);
  const [comics, setComics] = useState([]);

  const onClickRefresh = useCallback(() => {
    return utils.invoke('getComics', {}).then(({ comics }) => {
      setComics(comics);
    });
  }, []);

  const onClickSetting = useCallback(() => {
    setShowSetting(true);
  }, []);

  const onSettingClose = useCallback(() => {
    setShowSetting(false);
  }, []);

  return (
    <div className="text-[14px]">
      <div className="text-[24px] text-[#333] flex p-4">
        Ehentai Comic Manager

        <Button onClick={onClickSetting} className="ml-auto cursor-pointer text-black text-[14px]">
          <SettingOutlined />
          setting
        </Button>
      </div>

      <div>
        <Input placeholder="Search tags">
          <div>search</div>
        </Input>
      </div>

      <div>
      </div>

      <Setting show={showSetting} onClose={onSettingClose} />
    </div>
  );
}

export default Index;
