export default function CheckoutSteps({ current = 0, onNavigate }) {
  return <nav className="jsf-checkout-steps" aria-label="Steg i beställningen"><ol>
    {["Kundkorg", "Uppgifter", "Orderöversikt"].map((label, index) => <li key={label}>
      <button type="button" aria-current={index === current ? "step" : undefined} onClick={() => onNavigate(index)}><span aria-hidden="true">{index + 1}</span>{label}</button>
    </li>)}
  </ol></nav>;
}
