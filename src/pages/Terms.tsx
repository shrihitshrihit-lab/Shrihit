import PolicyPage from "./PolicyPage";

const Terms = () => (
  <PolicyPage
    title="Terms & Conditions"
    description="The terms you agree to when ordering from Shrihit."
  >
    <section>
      <h2 className="font-display text-xl font-semibold mb-2">Orders</h2>
      <p>
        Placing an order is an offer to buy. We confirm the order once payment is
        received. If an item turns out to be unavailable after you have paid, we
        will cancel that item and refund you in full.
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold mb-2">Pricing</h2>
      <p>
        All prices are in Indian Rupees and include applicable taxes unless stated
        otherwise. The amount you are charged is calculated on our servers from the
        current catalogue price, so the price shown at checkout is the price you pay.
        We may correct pricing errors before dispatch and will contact you if that
        affects your order.
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold mb-2">Payments</h2>
      <p>
        Payments are processed by Razorpay. We do not receive or store your card
        details. Coupon codes are subject to their own validity, minimum order value
        and usage limits, and may be withdrawn at any time.
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold mb-2">Product images</h2>
      <p>
        Our items are handcrafted, so colour, finish and minor dimensions can vary
        slightly from the photographs. This variation is a feature of handmade work
        and is not treated as a defect.
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold mb-2">Contact</h2>
      <p>
        Questions about these terms? Write to{" "}
        <a href="mailto:Shrihit02@gmail.com" className="text-primary hover:underline">
          Shrihit02@gmail.com
        </a>
        .
      </p>
    </section>
  </PolicyPage>
);

export default Terms;
