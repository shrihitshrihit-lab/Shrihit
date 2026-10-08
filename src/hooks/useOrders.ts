import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  subtotal: number;
  shipping_cost: number;
  total: number;
  courier_name?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shipped_at?: string | null;
  customer_email?: string | null;
  shipping_address: {
    full_name: string;
    phone: string;
    email?: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  price: number;
  created_at: string;
}

export interface CreateOrderData {
  order_number: string;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  shipping_cost: number;
  total: number;
  coupon_code?: string | null;
  discount_amount?: number;
  customer_email?: string | null;
  shipping_address: Order['shipping_address'];
  items: {
    product_id: string;
    product_name: string;
    product_image: string | null;
    quantity: number;
    price: number;
  }[];
}

export const useOrders = () => {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(order => ({
        ...order,
        shipping_address: order.shipping_address as unknown as Order['shipping_address'],
      })) as Order[];
    },
  });
};

export const useOrderWithItems = (orderId: string) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (orderError) throw orderError;
      if (!order) throw new Error('Order not found');

      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      return {
        ...order,
        shipping_address: order.shipping_address as unknown as Order['shipping_address'],
        order_items: items,
      } as Order;
    },
    enabled: !!orderId,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: CreateOrderData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          order_number: orderData.order_number,
          payment_method: orderData.payment_method,
          payment_status: orderData.payment_status,
          subtotal: orderData.subtotal,
          shipping_cost: orderData.shipping_cost,
          total: orderData.total,
          coupon_code: orderData.coupon_code ?? null,
          discount_amount: orderData.discount_amount ?? 0,
          customer_email: orderData.customer_email ?? orderData.shipping_address.email ?? null,
          shipping_address: orderData.shipping_address,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_image: item.product_image,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      return {
        ...order,
        shipping_address: order.shipping_address as unknown as Order['shipping_address'],
      } as Order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};

export interface MarkOrderPaidData {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
}

/**
 * Marks an already-created order as paid. Only called after the
 * razorpay-verify-payment edge function has confirmed the signature, so the
 * payment identifiers stored here are trustworthy for reconciliation/refunds.
 */
export const useMarkOrderPaid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, razorpayOrderId, razorpayPaymentId }: MarkOrderPaidData) => {
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
        })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
};
