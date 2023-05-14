import { useState, useCallback } from 'react';
import classNames from 'classnames';

export default function Button({ className, children, onClick }) {
  const [loading, setLoading] = useState(false);

  const onInternalClick = useCallback((e) => {
    if (loading) {
      return;
    }
    if (onClick) {
      const thenableP = onClick(e);
      if (thenableP && typeof thenableP.then === 'function') {
        thenableP.finally(() => {
          setLoading(false);
        });
      }
    }
  }, [onClick, loading]);

  return (
    <div className={classNames(className, 'inline-flex items-center justify-center', {
      'opacity-10': loading
    })} onClick={onInternalClick}> { children }</div>
  );
}
