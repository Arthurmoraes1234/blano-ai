import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const Input: React.FC<InputProps> = ({ label, id, ...props }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
        {label}
      </label>
      <input
        id={id}
        className="w-full bg-white/5 border border-white/10 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-[var(--btn-grad-to)] focus:border-[var(--btn-grad-to)] transition"
        {...props}
      />
    </div>
  );
};

export default Input;
