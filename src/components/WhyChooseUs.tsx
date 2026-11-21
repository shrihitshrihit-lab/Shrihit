import { motion } from "framer-motion";
import { Shield, Truck, Award, HeartHandshake } from "lucide-react";

const features = [
  {
    icon: Award,
    title: "100% Authentic Products",
    description: "Every item is sourced from trusted artisans. Pure brass, genuine materials, no compromises.",
  },
  {
    icon: Truck,
    title: "Pan-India Delivery",
    description: "Fast & secure shipping across India. Free delivery on orders of ₹600 and above.",
  },
  {
    icon: Shield,
    title: "Quality Assured",
    description: "Each piece is carefully inspected before dispatch. Your satisfaction is our blessing.",
  },
  {
    icon: HeartHandshake,
    title: "Customer First",
    description: "Easy returns, quick support & hassle-free shopping. We're here for you, always.",
  },
];

const WhyChooseUs = () => {
  return (
    <section className="py-20 md:py-32 bg-card">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="font-body text-sm tracking-[0.3em] text-primary font-medium mb-3">
            WHY SHRIHIT
          </p>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-foreground mb-4">
            The Shrihit Promise
          </h2>
          <p className="font-body text-muted-foreground text-lg max-w-2xl mx-auto">
            More than a store — we're your trusted partner in devotion.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center group"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                <feature.icon size={28} />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="font-body text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
