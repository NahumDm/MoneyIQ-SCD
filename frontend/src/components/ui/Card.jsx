export default function Card({ children, className = '', accent }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-white p-5 shadow-card transition-shadow hover:shadow-elevated ${className}`}>
      {accent && (
        <div className={`absolute left-0 top-0 h-1 w-full ${accent}`} />
      )}
      {children}
    </div>
  );
}
