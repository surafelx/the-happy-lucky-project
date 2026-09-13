import { FlowerMotif } from "@/components/FlowerMotif";

export function Mission() {
  return (
    <section className="container-page py-16">
      <div className="overflow-hidden rounded-[2.5rem] border border-ink/8 shadow-soft">
        <div className="grid md:grid-cols-2">
          <div className="bg-gradient-to-br from-rose-100 via-cream to-gold-50 p-10 sm:p-12">
            <FlowerMotif petal="#e6918e" clover="#41c0ab" className="h-14 w-14" />
            <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-ink">
              Mission
            </h2>
            <p className="mt-4 text-pretty text-lg leading-8 text-ink-soft">
              To turn tiny, everyday luck — a spare birr, an hour on a Sunday, a
              working laptop nobody needs anymore — into dependable care,
              classrooms and creative rooms for the neighbourhood.
            </p>
            <p className="mt-3 text-sm text-rose-700">
              Small coin, big luck. Every single time.
            </p>
          </div>
          <div className="bg-gradient-to-br from-teal-100 via-cream to-mint-50 p-10 sm:p-12">
            <FlowerMotif petal="#41c0ab" clover="#f2ab2f" className="h-14 w-14" />
            <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-ink">
              Vision
            </h2>
            <p className="mt-4 text-pretty text-lg leading-8 text-ink-soft">
              A corner of the city where every kid has a place at the long
              table — eating, drawing, studying and showing off — and where the
              word &ldquo;lucky&rdquo; stops meaning the few and starts meaning
              the many.
            </p>
            <p className="mt-3 text-sm text-teal-700">
              One day, the whole constellation lights up.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}