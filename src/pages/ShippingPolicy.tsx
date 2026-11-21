import PolicyPage from "./PolicyPage";

const ShippingPolicy = () => (
  <PolicyPage
    title="Shipping Policy"
    description="How and when we deliver your order."
  >
    <section>
      <h2 className="font-display text-xl font-semibold mb-2">Dispatch time</h2>
      <p>
        Orders are packed and dispatched within 1–2 business days of payment being
        confirmed. Orders placed on Sundays or public holidays are dispatched on the
        next working day.
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold mb-2">Delivery time</h2>
      <p>
        Once dispatched, delivery usually takes 3–7 business days depending on your
        location. Remote pin codes may take slightly longer.
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold mb-2">Shipping charges</h2>
      <p>
        Orders of ₹600 and above ship free. Orders below ₹600 have a flat shipping
        charge of ₹80, added to the total at checkout. Selected products marked as
        free shipping also ship at no extra cost when every item in the order qualifies.
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold mb-2">Tracking</h2>
      <p>
        You can view your orders any time under{" "}
        <a href="/account" className="text-primary hover:underline">
          My Account
        </a>
        . For tracking help, write to us at{" "}
        <a href="mailto:namaste@shrihit.in" className="text-primary hover:underline">
          namaste@shrihit.in
        </a>
        .
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold mb-2">Delays</h2>
      <p>
        We are not responsible for delays caused by courier partners, weather, or
        other events outside our control. If your order is significantly delayed,
        contact us and we will follow it up with the courier for you.
      </p>
    </section>
  </PolicyPage>
);

export default ShippingPolicy;
