export function SiteBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-br from-steel/40 via-navy/90 to-navy" />
      <div className="dotted-grid absolute inset-0 opacity-15" />
      <div className="absolute left-[36%] top-12 h-[500px] w-[500px] rounded-full bg-ice/18 blur-[130px]" />
      <div className="absolute -bottom-20 -left-20 h-[540px] w-[540px] rounded-full bg-teal/15 blur-[140px]" />
      <div className="absolute right-16 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-ice/20 blur-3xl" />
    </div>
  );
}
