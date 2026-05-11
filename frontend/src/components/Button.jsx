export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const variants = {
    primary: 'button-primary',
    secondary: 'button-secondary',
    danger: 'button-danger',
    success: 'button-success',
    outline: 'button-outline',
  };

  const sizes = {
    sm: 'button-sm',
    md: 'button-md',
    lg: 'button-lg',
  };

  return (
    <button
      className={`button ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
