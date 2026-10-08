import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, Smartphone, Truck, ShieldCheck, Check, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useRazorpay } from "@/hooks/useRazorpay";
import { useCoupon } from "@/hooks/useCoupon";
import { useCreateOrder, useMarkOrderPaid } from "@/hooks/useOrders";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";

const Checkout = () => {
  const { items, subtotal, clearCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { initiatePayment, isLoading: isRazorpayLoading } = useRazorpay();
  const createOrder = useCreateOrder();
  const markOrderPaid = useMarkOrderPaid();
  const coupon = useCoupon();
  const [couponInput, setCouponInput] = useState("");
  const { data: storeSettings } = useStoreSettings();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  const shippingThreshold = storeSettings?.free_shipping_threshold ?? 999;
  const shippingCost = storeSettings?.shipping_cost ?? 99;
  // Shipping is waived only when every item ships free, so adding one
  // free-shipping product cannot make an entire mixed cart ship free.
  const allItemsShipFree = items.length > 0 && items.every((item) => item.freeShipping);
  const shipping = allItemsShipFree || subtotal >= shippingThreshold ? 0 : shippingCost;
  const discount = coupon.applied?.discount ?? 0;
  const total = Math.max(0, subtotal + shipping - discount);
  const razorpayEnabled = storeSettings?.razorpay_enabled ?? true;
  const noPaymentMethodEnabled = !razorpayEnabled;

  const addMoreForFreeShipping = useMemo(() => {
    if (shipping === 0) {
      return 0;
    }

    return Math.max(0, shippingThreshold - subtotal);
  }, [shipping, shippingThreshold, subtotal]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const requiredFields = ["firstName", "lastName", "email", "phone", "address", "city", "state", "pincode"];
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (noPaymentMethodEnabled) {
      toast({
        title: "Payment Unavailable",
        description: "Online payment is currently disabled. Please contact support.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      const { error: anonError } = await supabase.auth.signInAnonymously();
      if (anonError) {
        setIsProcessing(false);
        toast({
          title: "Order Error",
          description: "Could not start a checkout session. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const orderData = {
      order_number: orderNumber,
      payment_method: "razorpay",
      payment_status: "pending",
      subtotal,
      shipping_cost: shipping,
      total,
      coupon_code: coupon.applied?.code ?? null,
      discount_amount: discount,
      customer_email: formData.email,
      shipping_address: {
        full_name: `${formData.firstName} ${formData.lastName}`,
        phone: formData.phone,
        email: formData.email,
        address_line1: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
      },
      items: items.map(item => ({
        product_id: item.id,
        product_name: item.name,
        product_image: item.image,
        quantity: item.quantity,
        price: item.price,
      })),
    };

    try {
      // Persist the order as pending *before* taking money, so a payment can
      // never end up with no matching order if the browser dies mid-flow.
      const pendingOrder = await createOrder.mutateAsync(orderData);

      await initiatePayment({
        receipt: orderNumber,
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        contact: formData.phone,
        onSuccess: async (response) => {
          try {
            await markOrderPaid.mutateAsync({
              orderId: pendingOrder.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
            });
            clearCart();
            navigate("/order-success", { state: { orderNumber } });
          } catch (error) {
            console.error("Error finalising order:", error);
            toast({
              title: "Payment Received",
              description: `Payment successful, but we couldn't update your order automatically. Please contact support with order ID: ${orderNumber}.`,
              variant: "destructive",
            });
          }
          setIsProcessing(false);
        },
        onFailure: (error) => {
          setIsProcessing(false);
          toast({
            title: "Payment Failed",
            description: error.message || "Razorpay payment failed. Please try again.",
            variant: "destructive",
          });
        },
        onDismiss: () => {
          setIsProcessing(false);
          toast({
            title: "Payment Cancelled",
            description: "Your order is saved as pending. You can retry the payment anytime.",
          });
        },
      });
      return;
    } catch (error) {
      console.error("Error placing order:", error);
      setIsProcessing(false);
      const errorMessage = error instanceof Error ? error.message : "Failed to place order. Please try again.";
      toast({
        title: "Order Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 pb-20 text-center">
          <h1 className="font-display text-3xl text-foreground mb-4">Your cart is empty</h1>
          <p className="text-muted-foreground mb-6">Add some items before checking out.</p>
          <Link to="/collections">
            <Button variant="sacred">Continue Shopping</Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 md:pt-28 pb-16">
        <div className="container mx-auto px-4">
          {/* Back Link */}
          <Link 
            to="/collections" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ChevronLeft size={18} />
            <span className="font-body text-sm">Continue Shopping</span>
          </Link>

          <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-8">
            Checkout
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Left - Form */}
            <div className="lg:col-span-2">
              <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-8">
                {/* Contact Information */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-xl p-6 shadow-sacred"
                >
                  <h2 className="font-display text-xl font-semibold text-foreground mb-6">
                    Contact Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="Enter first name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Enter last name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+91 98765 43210"
                        required
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Shipping Address */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-card rounded-xl p-6 shadow-sacred"
                >
                  <h2 className="font-display text-xl font-semibold text-foreground mb-6">
                    Shipping Address
                  </h2>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="address">Address *</Label>
                      <Input
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="House no, Street, Landmark"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder="City"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State *</Label>
                        <Input
                          id="state"
                          name="state"
                          value={formData.state}
                          onChange={handleInputChange}
                          placeholder="State"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pincode">Pincode *</Label>
                        <Input
                          id="pincode"
                          name="pincode"
                          value={formData.pincode}
                          onChange={handleInputChange}
                          placeholder="400001"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Payment Method */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-card rounded-xl p-6 shadow-sacred"
                >
                  <h2 className="font-display text-xl font-semibold text-foreground mb-6">
                    Payment Method
                  </h2>
                  {noPaymentMethodEnabled && (
                    <p className="text-sm text-destructive mb-4">
                      Online payment is currently unavailable. Please contact support.
                    </p>
                  )}
                  {razorpayEnabled && (
                    <div className="flex items-center space-x-4 p-4 rounded-lg border-2 border-primary bg-primary/5">
                      <Smartphone className="text-primary" size={24} />
                      <div>
                        <p className="font-medium text-foreground">Pay Online (Razorpay)</p>
                        <p className="text-sm text-muted-foreground">
                          UPI, Cards, Net Banking, Wallets
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Place Order Button - Mobile */}
                <div className="lg:hidden">
                  <Button 
                    type="submit" 
                    variant="sacred" 
                    size="lg" 
                    className="w-full"
                    disabled={isProcessing || isRazorpayLoading || noPaymentMethodEnabled}
                  >
                    {isProcessing || isRazorpayLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      `Pay ₹${total.toLocaleString()}`
                    )}
                  </Button>
                </div>
              </form>
            </div>

            {/* Right - Order Summary */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-card rounded-xl p-6 shadow-sacred sticky top-28"
              >
                <h2 className="font-display text-xl font-semibold text-foreground mb-6">
                  Order Summary
                </h2>

                {/* Cart Items */}
                <div className="space-y-4 mb-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-body text-sm font-medium text-foreground line-clamp-1">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        <p className="font-body text-sm font-semibold text-foreground">
                          ₹{(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* Coupon */}
                <div className="mb-4">
                  {coupon.applied ? (
                    <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-green-800 truncate">
                          {coupon.applied.code} applied
                        </p>
                        <p className="text-xs text-green-700">
                          You saved ₹{coupon.applied.discount.toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          coupon.clear();
                          setCouponInput("");
                        }}
                        className="text-xs text-green-800 underline shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <Input
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          placeholder="Coupon code"
                          className="uppercase"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={coupon.isChecking}
                          onClick={() => coupon.apply(couponInput, subtotal)}
                        >
                          {coupon.isChecking ? <Loader2 size={16} className="animate-spin" /> : "Apply"}
                        </Button>
                      </div>
                      {coupon.error && (
                        <p className="text-xs text-destructive mt-2">{coupon.error}</p>
                      )}
                    </>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium text-foreground">₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className={`font-medium ${shipping === 0 ? "text-green-600" : "text-foreground"}`}>
                      {shipping === 0 ? "FREE" : `₹${shipping}`}
                    </span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-medium text-green-600">
                        −₹{discount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {shipping > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Add ₹{addMoreForFreeShipping.toLocaleString()} more for free shipping
                    </p>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between mb-6">
                  <span className="font-display text-lg font-semibold text-foreground">Total</span>
                  <span className="font-display text-xl font-semibold text-foreground">
                    ₹{total.toLocaleString()}
                  </span>
                </div>

                {/* Place Order Button - Desktop */}
                <Button 
                  type="submit"
                  form="checkout-form"
                  variant="sacred" 
                  size="lg" 
                  className="w-full hidden lg:flex"
                  disabled={isProcessing || isRazorpayLoading || noPaymentMethodEnabled}
                >
                  {isProcessing || isRazorpayLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    `Pay ₹${total.toLocaleString()}`
                  )}
                </Button>

                {/* Trust Badges */}
                <div className="mt-6 pt-6 border-t border-border space-y-3">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <ShieldCheck size={18} className="text-primary" />
                    <span>100% Secure Payments</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Truck size={18} className="text-primary" />
                    <span>Fast & Safe Delivery</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Check size={18} className="text-primary" />
                    <span>Easy Returns & Refunds</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Checkout;
