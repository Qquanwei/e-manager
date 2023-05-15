// index page
import { selector, atom, useRecoilState } from 'recoil';
import { useCallback, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SettingOutlined } from '@ant-design/icons';
import { Container } from 'antd';

import Button from '../components/button';
import Input from '../components/input';
import Setting from './setting';
import * as utils from '../utils';

function Index() {
  const [showSetting, setShowSetting] = useState(false);
  const [comics, setComics] = useState([]);

  const onRefresh = useCallback(() => {
    return utils.invoke('getComics', { page: 0, pageSize: 20}).then(({ comics }) => {
      setComics(comics);
    });
  }, []);

  useEffect(() => {
    onRefresh();
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

      <div className="text-black">
        {
          (comics || []).map((comic) => {
            return (
              <Link to={`/comic/${comic.id}`} key={comic.id} className="cursor-pointer w-[300px] h-[300px] block bg-gray-300/10 rounded p-2 border-box" data-id={comic.id}>
                <div>{ comic.title }</div>
              </Link>
            )
          })
        }
      </div>

      <Setting show={showSetting} onClose={onSettingClose} />
    </div>
  );
}

export default Index;
