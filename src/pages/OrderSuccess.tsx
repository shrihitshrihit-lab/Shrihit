import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Package, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const OrderSuccess = () => {
  const location = useLocation();
  const orderNumber = (location.state as { orderNumber?: string } | null)?.orderNumber;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-24 h-24 mx-auto mb-8 bg-green-100 rounded-full flex items-center justify-center"
        >
          <CheckCircle size={48} className="text-green-600" />
        </motion.div>

        {/* Message */}
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-4">
          Order Placed Successfully!
        </h1>
        <p className="font-body text-muted-foreground mb-2">
          Thank you for shopping with श्रीहित SHRIHIT
        </p>
        <p className="font-body text-sm text-muted-foreground mb-8">
          When your order ships, we'll email and WhatsApp you the courier tracking details.
          You can also check status anytime in My Account.
        </p>

        {/* Order Info */}
        <div className="bg-card rounded-xl p-6 shadow-sacred mb-8">
          <div className="flex items-center justify-center gap-3 text-primary mb-4">
            <Package size={24} />
            <span className="font-display text-lg font-medium">
              {orderNumber ? `Order #${orderNumber}` : "Order confirmed"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Estimated delivery: 3-5 business days
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/collections">
            <Button variant="sacred" size="lg" className="w-full sm:w-auto">
              Continue Shopping
            </Button>
          </Link>
          <Link to="/">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              <Home size={18} className="mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Support */}
        <p className="mt-8 text-sm text-muted-foreground">
          Need help? Contact us at{" "}
          <a href="mailto:support@shrihit.com" className="text-primary hover:underline">
            support@shrihit.com
          </a>
        </p>
      </motion.div>
    </div>
  );
};

export default OrderSuccess;
