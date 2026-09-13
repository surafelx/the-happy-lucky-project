export function SiteBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="bg-dots absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
      <div className="animate-drift absolute -left-36 -top-40 h-[34rem] w-[34rem] rounded-full bg-rose-200/45 blur-3xl" />
      <div
        className="animate-drift absolute -right-40 top-[28%] h-[30rem] w-[30rem] rounded-full bg-teal-200/45 blur-3xl"
        style={{ animationDelay: "-8s" }}
      />
      <div
        className="animate-drift absolute -bottom-44 left-[18%] h-[34rem] w-[34rem] rounded-full bg-gold-200/45 blur-3xl"
        style={{ animationDelay: "-16s" }}
      />
      <div
        className="animate-drift absolute right-[12%] bottom-[6%] h-[20rem] w-[20rem] rounded-full bg-mint-200/45 blur-3xl"
        style={{ animationDelay: "-4s" }}
      />
    </div>
  );
}