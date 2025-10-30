import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  as?: React.ElementType;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  as: Component = 'button',
  ...props
}) => {
  const isDisabled = isLoading || props.disabled;

  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-300';

  const variantStyles = {
    primary: 'btn-premium',
    secondary: 'bg-white/10 text-white hover:bg-white/20 focus:ring-gray-500 border border-white/20',
    ghost: 'bg-transparent text-white/80 hover:bg-white/10 hover:text-white',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const allProps: any = {
    className: `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`,
    ...props,
  };

  if (Component === 'button') {
    allProps.disabled = isDisabled;
  }

  return (
    <Component {...allProps}>
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </Component>
  );
};

export default Button;