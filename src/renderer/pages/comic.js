import { Link, useParams } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import * as atoms from '../store/selector';
import * as utils from '../utils';

function Comic() {
  const { id } = useParams();
  const comic = useRecoilValue(atoms.comicInfo(id));

  return (
    <div>
      <div className="sticky top-0 bg-white px-4 py-2 shadow shadow-gray-300">
        <Link to="/" relative="path" className="mr-3">
          Home
        </Link>
        <Link to={`/profile/${id}`}>{comic.title}</Link>
      </div>
      <div className="flex flex-col items-center">
        {(comic.imgList || []).map((imgName) => {
          return (
            <img src={utils.imgUrl(comic.location, imgName)} key={imgName} />
          );
        })}
      </div>
    </div>
  );
}

export default Comic;
