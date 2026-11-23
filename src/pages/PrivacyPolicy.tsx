import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 md:pt-32">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-b from-muted/50 to-background">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center max-w-3xl mx-auto"
            >
              <h1 className="font-display text-4xl md:text-5xl font-semibold text-foreground mb-6">
                Privacy Policy
              </h1>
              <p className="font-body text-muted-foreground">
                Last updated: January 15, 2026
              </p>
            </motion.div>
          </div>
        </section>

        {/* Content */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="max-w-3xl mx-auto prose prose-lg"
            >
              <div className="space-y-8 font-body text-muted-foreground">
                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                    1. Information We Collect
                  </h2>
                  <p className="leading-relaxed mb-4">
                    We collect information you provide directly to us, including:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Name, email address, and phone number when you create an account</li>
                    <li>Shipping and billing addresses for order fulfillment</li>
                    <li>Payment information (processed securely through our payment partners)</li>
                    <li>Order history and preferences</li>
                    <li>Communications you send to us</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                    2. How We Use Your Information
                  </h2>
                  <p className="leading-relaxed mb-4">
                    We use the information we collect to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Process and fulfill your orders</li>
                    <li>Send order confirmations and shipping updates</li>
                    <li>Respond to your inquiries and provide customer support</li>
                    <li>Send promotional communications (with your consent)</li>
                    <li>Improve our products and services</li>
                    <li>Prevent fraud and enhance security</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                    3. Information Sharing
                  </h2>
                  <p className="leading-relaxed">
                    We do not sell, trade, or rent your personal information to third parties. 
                    We may share your information only with:
                  </p>
                  <ul className="list-disc pl-6 space-y-2 mt-4">
                    <li>Shipping partners to deliver your orders</li>
                    <li>Payment processors to handle transactions</li>
                    <li>Service providers who assist in our operations</li>
                    <li>Legal authorities when required by law</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                    4. Data Security
                  </h2>
                  <p className="leading-relaxed">
                    We implement appropriate technical and organizational measures to protect 
                    your personal information against unauthorized access, alteration, disclosure, 
                    or destruction. This includes encryption of sensitive data, secure servers, 
                    and regular security assessments.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                    5. Cookies and Tracking
                  </h2>
                  <p className="leading-relaxed">
                    We use cookies and similar technologies to enhance your browsing experience, 
                    analyze website traffic, and personalize content. You can control cookie 
                    preferences through your browser settings.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                    6. Your Rights
                  </h2>
                  <p className="leading-relaxed mb-4">
                    You have the right to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Access your personal information</li>
                    <li>Correct inaccurate data</li>
                    <li>Request deletion of your data</li>
                    <li>Opt-out of marketing communications</li>
                    <li>Withdraw consent where applicable</li>
                  </ul>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                    7. Data Retention
                  </h2>
                  <p className="leading-relaxed">
                    We retain your personal information for as long as necessary to fulfill 
                    the purposes outlined in this policy, comply with legal obligations, 
                    resolve disputes, and enforce our agreements.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                    8. Children&apos;s Privacy
                  </h2>
                  <p className="leading-relaxed">
                    Our services are not directed to children under 18. We do not knowingly 
                    collect personal information from children. If you believe we have 
                    collected information from a child, please contact us immediately.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                    9. Changes to This Policy
                  </h2>
                  <p className="leading-relaxed">
                    We may update this privacy policy from time to time. We will notify you 
                    of any significant changes by posting the new policy on this page and 
                    updating the &quot;Last updated&quot; date.
                  </p>
                </section>

                <section>
                  <h2 className="font-display text-2xl font-semibold text-foreground mb-4">
                    10. Contact Us
                  </h2>
                  <p className="leading-relaxed">
                    If you have any questions about this Privacy Policy, please contact us at:
                  </p>
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <p><strong>Email:</strong> Shrihit02@gmail.com</p>
                    <p><strong>Phone:</strong> 7988140173</p>
                    <p><strong>Address:</strong> 613, Jundla Gate, Karnal, Haryana</p>
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;