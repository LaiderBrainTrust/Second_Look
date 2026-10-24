const services = [
  { title: 'Holdings evidence', text: 'Recent player reviews and current player counts from Steam, beside company profiles and dated news from Akta. Sample sizes and capture dates are shown. Available for the example holdings.' },
  { title: 'A question for the manager', text: 'Saved evidence becomes one proposed question about the cash attached to the interest. It is a proposal. Nothing is sent until the investor shares it.' },
  { title: 'Offer comparison', text: 'Compare competing offers by cash before tax. Unknown fees and adjustments stay unresolved, never zero, and a funding check tests whether the money arrives when it is needed.' },
  { title: 'Decision record', text: 'Each question, answer and approval is kept with the offer version it applied to. When a term changes, the earlier approval becomes historical and stays on the record.' },
];

export function Services() {
  return <section className="services" aria-labelledby="services-title">
    <p className="eyebrow">Services</p>
    <div className="hero-top">
      <h1 id="services-title">What the work covers.</h1>
      <p className="hero-sub">Four parts, each tied to the offer version under review.</p>
    </div>
    <div className="service-block">
      {services.map((s, i) => <article key={s.title} className="service">
        <span className="service-no">{String(i + 1).padStart(2, '0')}</span>
        <h2>{s.title}</h2>
        <p>{s.text}</p>
      </article>)}
    </div>
  </section>;
}
