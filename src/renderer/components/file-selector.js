import { useCallback } from 'react';
import Button from './button';
import { invoke } from '../utils';
// type: file or directory, default is file

const filtersTypeMap = {
  'sqlite3': [{
    name: 'sqlite3',
    extensions: ['.sqlite', '.sqlite3', '.db', '.db3', '.s3db', '.sl3']
  }]
};

function FileSelector({ type, title, allowMultiple, value, onChange, filtersType, children }) {

  const onClickSelect = useCallback(() => {
    return invoke('takeFile', {
      title,
      allowMultiple,
      filters: filtersTypeMap[filtersType] || undefined
    }).then(({ fileName }) => {
      // filename is a array
      if (onChange) {
        if (allowMultiple) {
          onChange(fileName);
        } else {
          onChange(fileName[0]);
        }
      }
    });
  }, []);

  return (
    <div className="inline-flex" onClick={onClickSelect}>
      { children }
    </div>
  );
}

export default FileSelector;
