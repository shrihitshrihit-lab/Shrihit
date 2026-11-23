import PolicyPage from "./PolicyPage";

const RefundPolicy = () => (
  <PolicyPage
    title="Returns & Refunds"
    description="Cancellations, returns and how refunds are processed."
  >
    <section>
      <h2 className="font-display text-xl font-semibold mb-2">Cancellations</h2>
      <p>
        An order can be cancelled any time before it is dispatched. Write to us with
        your order number and we will cancel it and refund the full amount. Once an
        order has been dispatched it can no longer be cancelled, but you may return
        it as described below.
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold mb-2">Returns</h2>
      <p>
        If an item arrives damaged, defective, or is not what you ordered, tell us
        within 7 days of delivery and we will arrange a replacement or a refund.
        Please share photographs of the item and the packaging so we can raise it
        with our courier.
      </p>
      <p className="mt-3">
        Items must be unused and returned in their original packaging. For hygiene
        and religious reasons, consumables such as incense, dhoop and camphor cannot
        be returned once opened, unless they arrived damaged.
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold mb-2">Refunds</h2>
      <p>
        Approved refunds are credited back to the original payment method. Once we
        process the refund, it typically reaches your account within 5–7 business
        days, depending on your bank or UPI provider.
      </p>
    </section>

    <section>
      <h2 className="font-display text-xl font-semibold mb-2">How to raise a request</h2>
      <p>
        Email{" "}
        <a href="mailto:Shrihit02@gmail.com" className="text-primary hover:underline">
          Shrihit02@gmail.com
        </a>{" "}
        with your order number and a short description of the issue. We reply to
        every request, usually within two working days.
      </p>
    </section>
  </PolicyPage>
);

export default RefundPolicy;
