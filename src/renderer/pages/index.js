// index page
import { useCallback, useState, useEffect } from 'react';
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import { SettingOutlined } from '@ant-design/icons';
import { Pagination, Input, Form, Button } from 'antd';

import Setting from './setting';
import * as utils from '../utils';

// css 中一个格子为 200/150, 这里要根据图片尺寸选取合适的格子数量
const GRID_WIDTH = 200;
const GRID_HEIGHT = 150;

const PAIRS = [
  // w, h
  [1, 1],
  [2, 1],
  [3, 1],
  [1, 2],
  [3, 2],
];

function getCardGridStyle(width, height) {
  // ratio = m / n
  const ratio = (width / height) * (GRID_HEIGHT / GRID_WIDTH);
  // 找出最接近 ratio 的 pair
  let minPairIndex = 0;
  let minValue = Infinity;
  for (let pairIndex = 0; pairIndex < PAIRS.length; ++pairIndex) {
    const pair = PAIRS[pairIndex];
    const pairRatio = pair[0] / pair[1];
    if (Math.abs(ratio - pairRatio) < minValue) {
      minValue = Math.abs(ratio - pairRatio);
      minPairIndex = pairIndex;
    }
  }
  const pair = PAIRS[minPairIndex];
  const rowspans = {
    1: 'row-span-1',
    2: 'row-span-2',
    3: 'row-span-3',
    4: 'row-span-4',
  };

  const colspans = {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
  };
  return `row-start-auto ${rowspans[pair[1]]} col-start-auto ${
    colspans[pair[0]]
  }`;
}

function Index() {
  const [showSetting, setShowSetting] = useState(false);
  const [comics, setComics] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);

  const onRefresh = useCallback((page, pageSize, keyword) => {
    return utils
      .invoke('getComics', { keyword, page: page - 1, pageSize })
      .then(({ comics, total, hasMore }) => {
        setTotal(total);
        setHasMore(hasMore);
        setComics(comics);
      });
  }, []);

  const onSubmitSearch = useCallback(
    (data) => {
      console.log(data);
      onRefresh(1, 20, data.search);
    },
    [page, pageSize]
  );

  useEffect(() => {
    //utils.invoke('getLocalNetwork');
    onRefresh(page, pageSize);
  }, [page, pageSize]);

  const onClickSetting = useCallback(() => {
    setShowSetting(true);
  }, []);

  const onSettingClose = useCallback(() => {
    setShowSetting(false);
  }, []);

  const onClickQrCode = useCallback(() => {
    utils.showQrModal();
  }, []);
  return (
    <div className="text-[14px]">
      <div className="sticky top-0 z-10 bg-white box-shadow">
        <div className="text-[24px] text-[#333] flex p-4">
          Ehentai Comic Manager
          <Button
            onClick={onClickSetting}
            className="ml-auto cursor-pointer text-black text-[14px]"
          >
            <SettingOutlined />
            setting
          </Button>

          <Button onClick={onClickQrCode}>qrcode</Button>
        </div>

        <Form
          className="flex items-center justify-center"
          onFinish={onSubmitSearch}
        >
          <Form.Item name="search" noStyle>
            <Input className="w-[300px]" />
          </Form.Item>
          <Button type="primary" htmlType="submit">
            Search
          </Button>
          <Pagination
            className="ml-2 flex-shrink"
            responsive={true}
            showQuickJumper={true}
            onChange={setPage}
            current={page}
            total={total}
            pageSize={pageSize}
            onShowSizeChange={(_, size) => setPageSize(size)}
          />
        </Form>
      </div>

      <div className="comic-grid-container text-black grid text-black p-2">
        {(comics || []).map((comic) => {
          const style = getCardGridStyle(comic.width, comic.height);
          return (
            <Link
              to={`/profile/${comic.id}`}
              key={comic.id}
              className={classNames(
                'group p-2 relative cursor-pointer block bg-gray-300/10 rounded box-border overflow-hidden border-box bg-white hover:scale-[1.1] rotate-0 hover:outline outline-black-300 hover:rotate-[5deg] transition-all z-0 hover:z-10',
                style
              )}
              data-id={comic.id}
            >
              <div className="bg-gray-500/80 text-white absolute bottom-0 flex items-center justify-center text-center">
                {comic.title}
              </div>
              <img
                src={utils.imgUrl(comic.location, comic.cover)}
                className="min-w-full min-h-full rounded"
              ></img>
            </Link>
          );
        })}
      </div>

      <Setting show={showSetting} onClose={onSettingClose} />
    </div>
  );
}

export default Index;
