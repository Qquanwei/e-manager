/* eslint-disable jsx-a11y/alt-text */
import { useParams, Link } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { Tag, Button } from 'antd';
import * as atoms from '../store/selector';
import * as utils from '../utils';
import { useCallback } from 'react';

function parseTags(str) {
  try {
    return JSON.parse(str.replaceAll('\'', '\"'));
  } catch {
    return str;
  }
}

export default function Profile() {
  const { id } = useParams();
  const comic = useRecoilValue(atoms.comicInfo(id));

  const onClickLocal = useCallback(() => {
    utils.invoke('openLocalDir', { fileName: comic.location});
  }, []);

  return (
    <div>
      <div className='flex py-4 px-10 sticky top-0 bg-white shadow'>
      <Link to="/">Home</Link>
      <div className='ml-2'>{comic.title}</div>
      </div>
      <div className="mt-2 px-4 flex">
        <Link
          to={`/comic/${id}`}
          className="block w-[300px] h-[350px] shrink-0 flex items-center overflow-hidden rounded border p-2"
        >
          <img
            className="w-[300px] "
            src={utils.imgUrl(comic.location, comic.imgList[0])}
          />
        </Link>
        <div className="ml-10">
          {Object.keys(comic.tags || {}).map((k) => {
            if (!comic.tags[k]) {
              return null;
            }
            return (
              <div key={k} className="flex">
                <div className='mr-2'> {k}: </div>
                {[].concat(parseTags(comic.tags[k])).map((tagValue) => {
                  return <Tag className='cursor-pointer' key={tagValue}>{tagValue} </Tag>;
                })}
              </div>
            );
          })}
        </div>



      </div>
      <div className='px-4 py-2'>
          <Button onClick={onClickLocal}>在文件管理器中打开</Button>
        </div>

      <div className='px-10 mt-2'>
          <h1>预览</h1>
          <div className='flex flex-row flex-wrap overflow-auto px-10 box-border w-full'>
          {
            comic.imgList.slice(0, 20).map((imgName) => {
              return <img className='w-[200px]' src={utils.imgUrl(comic.location, imgName)} key={imgName}></img>
            })
          }
          </div>
        </div>

    </div>
  );
}
