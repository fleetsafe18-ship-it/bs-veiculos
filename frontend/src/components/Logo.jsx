export default function Logo({ size = 44 }) {
  return (
    <img
      src="/img/logo.jpg"
      alt="BS Veículos"
      style={{ height: size, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
    />
  );
}
