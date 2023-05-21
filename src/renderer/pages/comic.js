import { Link, useParams } from 'react-router-dom';
import { useRecoilValue, useRecoilRefresher_UNSTABLE } from 'recoil';
import { useState, useEffect, useCallback, useRef } from 'react';
import * as atoms from '../store/selector';
import * as utils from '../utils';

function Comic() {
  const { id } = useParams();
  const comic = useRecoilValue(atoms.comicInfo(id));
  const refresh = useRecoilRefresher_UNSTABLE(atoms.comicInfo(id));
  const [isFirst, setIsFirst] = useState(true);
  const imgContaienrRef = useRef();

  useEffect(() => {
    return () => {
      refresh();
    };
  }, []);

  const onVisibleChange = useCallback((position) => {
    utils.invoke('updateComicPosition', { id, position });
  }, [id]);

  useEffect(() => {
    // 当首次进入之后，才开始进行visiblechange展示
    if (!isFirst) {
      const observer = new IntersectionObserver((entities) => {
        if (entities[0].intersectionRatio) {
          const position = Number(entities[0].target.dataset.index);
          if (position !== 0) {
            onVisibleChange(position);
          }
        }
      });

      imgContaienrRef.current.querySelectorAll('img').forEach((ele) => {
        observer.observe(ele);
      });

      return () => {
        observer.disconnect();
      };
    }

    return () => {};
  }, [isFirst]);

  const onImgLoad = useCallback(
    (e) => {
      if (
        isFirst &&
        Number(e.currentTarget.dataset.index) === (comic.position || 0)
      ) {
        const target = e.currentTarget;
        setTimeout(() => {
          target.scrollIntoView();
        }, 50);
        setTimeout(() => {
          setIsFirst(false);
        }, 100);
      }
    },
    [isFirst]
  );

  return (
    <div>
      <div className="sticky top-0 bg-white px-4 py-2 shadow shadow-gray-300">
        <Link to="/" relative="path" className="mr-3">
          Home
        </Link>
        <Link to={`/profile/${id}`}>{comic.title}</Link>
      </div>
      <div className="flex flex-col items-center" ref={imgContaienrRef}>
        {(comic.imgList || []).map((imgName, index) => {
          return (
            <img
              onLoad={onImgLoad}
              data-index={index}
              src={utils.imgUrl(comic.location, imgName)}
              key={imgName}
            />
          );
        })}
      </div>
    </div>
  );
}

export default Comic;
