function LoadingState({ label = 'Cargando...', className = '' }) {
  return (
    <p className={`text-muted ${className}`.trim()}>
      {label}
    </p>
  );
}

export default LoadingState;
