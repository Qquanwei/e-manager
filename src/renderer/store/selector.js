import { selectorFamily } from 'recoil';
import * as utils from '../utils';

export const comicInfo = selectorFamily({
  key: 'comic info selector',
  get: (id) => () => {
    return utils.invoke('getComicArchiveInfo', { id });
  }
});
