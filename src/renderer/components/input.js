import classNames from 'classnames';
function Input({ children, className, placeholder }) {

  return (
    <div className={classNames(className, 'focus-within:border-sky-300 px-2 inline-flex items-center border-gray-200 border')}>
      <input className="py-2 pl-2 mr-2" name="" type="text" placeholder={placeholder}/>
      <div className="cursor-pointer">
        { children }
      </div>
    </div>
  )
}

export default Input;
