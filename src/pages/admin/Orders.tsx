import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, Search, Filter, Package, Clock, CheckCircle, XCircle, Truck, Download, Printer, Bell, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ShippingAddress {
  full_name: string;
  phone: string;
  email?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  status: string;
  payment_status: string;
  payment_method: string;
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
  shipping_address: ShippingAddress;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

interface ShipFormState {
  courier_name: string;
  tracking_number: string;
  tracking_url: string;
  notify_customer: boolean;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock size={14} />,
  processing: <Package size={14} />,
  shipped: <Truck size={14} />,
  delivered: <CheckCircle size={14} />,
  cancelled: <XCircle size={14} />,
};

const Orders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [shipOrder, setShipOrder] = useState<Order | null>(null);
  const [isShipping, setIsShipping] = useState(false);
  const [shipForm, setShipForm] = useState<ShipFormState>({
    courier_name: "",
    tracking_number: "",
    tracking_url: "",
    notify_customer: true,
  });
  const [whatsappFallbackUrl, setWhatsappFallbackUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          toast({
            title: "🎉 New Order Received!",
            description: `Order #${(payload.new as { order_number: string }).order_number} just came in.`,
          });
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const typedData = (data || []).map(order => ({
        ...order,
        shipping_address: order.shipping_address as unknown as ShippingAddress,
      }));
      setOrders(typedData);
    }
    setIsLoading(false);
  };

  const openShipDialog = (order: Order) => {
    setShipOrder(order);
    setWhatsappFallbackUrl(null);
    setShipForm({
      courier_name: order.courier_name || "",
      tracking_number: order.tracking_number || "",
      tracking_url: order.tracking_url || "",
      notify_customer: true,
    });
  };

  const patchOrderLocally = (
    orderId: string,
    patch: Partial<Order>,
  ) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, ...patch } : order)),
    );
    setSelectedOrder((prev) =>
      prev && prev.id === orderId ? { ...prev, ...patch } : prev,
    );
  };

  const handleStatusChange = (order: Order, newStatus: string) => {
    if (newStatus === "shipped") {
      openShipDialog(order);
      return;
    }
    void updateOrderStatus(order.id, newStatus, undefined, { toastSuccess: true });
  };

  const updateOrderStatus = async (
    orderId: string,
    newStatus: string,
    extras?: Partial<{
      courier_name: string;
      tracking_number: string;
      tracking_url: string | null;
      shipped_at: string;
    }>,
    options?: { toastSuccess?: boolean },
  ) => {
    const previous = orders.find((order) => order.id === orderId);
    const localPatch: Partial<Order> = {
      status: newStatus,
      ...(extras?.courier_name !== undefined ? { courier_name: extras.courier_name } : {}),
      ...(extras?.tracking_number !== undefined ? { tracking_number: extras.tracking_number } : {}),
      ...(extras?.tracking_url !== undefined ? { tracking_url: extras.tracking_url } : {}),
      ...(extras?.shipped_at !== undefined ? { shipped_at: extras.shipped_at } : {}),
    };

    // Update UI immediately so the dropdown doesn't wait for a refresh
    patchOrderLocally(orderId, localPatch);

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus, ...extras })
      .eq("id", orderId);

    if (error) {
      if (previous) {
        patchOrderLocally(orderId, previous);
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        action: "updated",
        entity_type: "order",
        entity_id: orderId,
        entity_name: previous?.order_number,
        new_data: { status: newStatus, ...extras },
      });
    }

    if (options?.toastSuccess) {
      toast({ title: "Success", description: "Order status updated" });
    }

    return true;
  };

  const notifyOrderShipped = async (orderId: string) => {
    const { data, error } = await supabase.functions.invoke<{
      ok?: boolean;
      email?: { sent: boolean; error?: string; to?: string };
      whatsapp?: { sent: boolean; error?: string; fallback_url?: string | null };
      error?: string;
    }>("notify-order-shipped", {
      body: { order_id: orderId },
    });

    if (error) {
      throw new Error(error.message || "Notification failed");
    }
    if (data?.error) {
      throw new Error(data.error);
    }
    return data;
  };

  const confirmShipOrder = async () => {
    if (!shipOrder) return;

    const courier = shipForm.courier_name.trim();
    const tracking = shipForm.tracking_number.trim();
    if (!courier || !tracking) {
      toast({
        title: "Tracking required",
        description: "Enter courier name and tracking / AWB number before shipping.",
        variant: "destructive",
      });
      return;
    }

    setIsShipping(true);
    setWhatsappFallbackUrl(null);

    const extras = {
      courier_name: courier,
      tracking_number: tracking,
      tracking_url: shipForm.tracking_url.trim() || null,
      shipped_at: shipOrder.shipped_at || new Date().toISOString(),
    };

    const ok = await updateOrderStatus(shipOrder.id, "shipped", extras);
    if (!ok) {
      setIsShipping(false);
      return;
    }

    let notifySummary = "Order marked as shipped.";
    let fallbackUrl: string | null = null;
    let whatsappSent = false;

    if (shipForm.notify_customer) {
      try {
        const notify = await notifyOrderShipped(shipOrder.id);
        const emailOk = !!notify?.email?.sent;
        whatsappSent = !!notify?.whatsapp?.sent;
        fallbackUrl = notify?.whatsapp?.fallback_url || null;

        const parts: string[] = [];
        if (emailOk) parts.push("email sent");
        else if (notify?.email?.error) parts.push(`email: ${notify.email.error}`);
        if (whatsappSent) parts.push("WhatsApp sent");
        else if (fallbackUrl) parts.push("open WhatsApp link to message customer");
        else if (notify?.whatsapp?.error) parts.push(`WhatsApp: ${notify.whatsapp.error}`);

        notifySummary = parts.length
          ? `Shipped. ${parts.join(" · ")}`
          : "Shipped. Customer notification could not be completed.";
      } catch (error) {
        notifySummary =
          error instanceof Error
            ? `Shipped, but notify failed: ${error.message}`
            : "Shipped, but customer notification failed.";
      }
    }

    setIsShipping(false);
    toast({ title: "Order shipped", description: notifySummary });
    await fetchOrders();

    // Keep dialog open if admin still needs to tap the WhatsApp fallback link
    if (shipForm.notify_customer && fallbackUrl && !whatsappSent) {
      setWhatsappFallbackUrl(fallbackUrl);
      return;
    }

    setShipOrder(null);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shipping_address.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const allFilteredSelected =
    filteredOrders.length > 0 && filteredOrders.every((order) => selectedIds.has(order.id));
  const someFilteredSelected = filteredOrders.some((order) => selectedIds.has(order.id));

  const viewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDialogOpen(true);
  };

  const toggleOrderSelection = (orderId: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(orderId);
      else next.delete(orderId);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredOrders.map((order) => order.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const logOrderDeletes = async (deletedOrders: Order[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || deletedOrders.length === 0) return;

    await supabase.from("activity_logs").insert(
      deletedOrders.map((order) => ({
        user_id: user.id,
        action: "deleted",
        entity_type: "order",
        entity_id: order.id,
        entity_name: order.order_number,
        old_data: { status: order.status, total: order.total },
      }))
    );
  };

  const deleteOrdersByIds = async (ids: string[]) => {
    if (ids.length === 0) return;

    setIsDeleting(true);
    const deletedOrders = orders.filter((order) => ids.includes(order.id));

    const { error } = await supabase.from("orders").delete().in("id", ids);

    setIsDeleting(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    await logOrderDeletes(deletedOrders);

    toast({
      title: "Orders deleted",
      description:
        ids.length === 1
          ? `Order #${deletedOrders[0]?.order_number || ""} removed.`
          : `${ids.length} orders removed.`,
    });

    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });

    if (selectedOrder && ids.includes(selectedOrder.id)) {
      setIsDialogOpen(false);
      setSelectedOrder(null);
    }

    setOrderToDelete(null);
    setBulkDeleteOpen(false);
    fetchOrders();
  };

  const handleDeleteSingle = async () => {
    if (!orderToDelete) return;
    await deleteOrdersByIds([orderToDelete.id]);
  };

  const handleDeleteBulk = async () => {
    await deleteOrdersByIds(Array.from(selectedIds));
  };

  const exportToCsv = () => {
    const headers = ["Order Number", "Customer", "City", "Status", "Payment Status", "Payment Method", "Total", "Date"];
    const rows = filteredOrders.map((order) => [
      order.order_number,
      order.shipping_address.full_name,
      order.shipping_address.city,
      order.status,
      order.payment_status,
      order.payment_method,
      order.total,
      format(new Date(order.created_at), "dd MMM yyyy HH:mm"),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printInvoice = () => {
    if (!selectedOrder) return;

    const itemsHtml = (selectedOrder.order_items || [])
      .map(
        (item) => `
        <tr>
          <td style="padding:8px 0;">${item.product_name}</td>
          <td style="padding:8px 0;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 0;text-align:right;">₹${item.price}</td>
          <td style="padding:8px 0;text-align:right;">₹${item.price * item.quantity}</td>
        </tr>`
      )
      .join("");

    const invoiceWindow = window.open("", "_blank", "width=800,height=900");
    if (!invoiceWindow) return;

    invoiceWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${selectedOrder.order_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #1a1a1a; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { text-align: left; border-bottom: 2px solid #333; padding-bottom: 8px; }
            th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: right; }
            th:nth-child(2) { text-align: center; }
            .total-row td { border-top: 2px solid #333; font-weight: bold; padding-top: 8px; }
            .meta { color: #555; margin-bottom: 4px; }
          </style>
        </head>
        <body>
          <h1>Shrihit</h1>
          <p class="meta">Invoice for Order #${selectedOrder.order_number}</p>
          <p class="meta">Date: ${format(new Date(selectedOrder.created_at), "dd MMM yyyy, HH:mm")}</p>
          <p class="meta">Payment: ${selectedOrder.payment_method.toUpperCase()} (${selectedOrder.payment_status})</p>
          <hr />
          <p><strong>${selectedOrder.shipping_address.full_name}</strong></p>
          <p>${selectedOrder.shipping_address.address_line1}${selectedOrder.shipping_address.address_line2 ? ", " + selectedOrder.shipping_address.address_line2 : ""}</p>
          <p>${selectedOrder.shipping_address.city}, ${selectedOrder.shipping_address.state} - ${selectedOrder.shipping_address.pincode}</p>
          <p>Phone: ${selectedOrder.shipping_address.phone}</p>
          <table>
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr><td colspan="3" style="padding-top:12px;">Subtotal</td><td style="text-align:right;padding-top:12px;">₹${selectedOrder.subtotal}</td></tr>
              <tr><td colspan="3">Shipping</td><td style="text-align:right;">₹${selectedOrder.shipping_cost}</td></tr>
              <tr class="total-row"><td colspan="3">Total</td><td style="text-align:right;">₹${selectedOrder.total}</td></tr>
            </tbody>
          </table>
        </body>
      </html>
    `);
    invoiceWindow.document.close();
    invoiceWindow.focus();
    invoiceWindow.print();
  };

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    processing: orders.filter(o => o.status === "processing").length,
    shipped: orders.filter(o => o.status === "shipped").length,
    delivered: orders.filter(o => o.status === "delivered").length,
  };

  return (
    <div className="p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-foreground mb-2">Orders</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              Manage customer orders
              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                <Bell size={12} /> Live updates on
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
                disabled={isDeleting}
              >
                <Trash2 size={16} className="mr-2" />
                Delete selected ({selectedIds.size})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={exportToCsv} disabled={filteredOrders.length === 0}>
              <Download size={16} className="mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: "Total", value: stats.total, color: "bg-muted" },
            { label: "Pending", value: stats.pending, color: "bg-yellow-100" },
            { label: "Processing", value: stats.processing, color: "bg-blue-100" },
            { label: "Shipped", value: stats.shipped, color: "bg-purple-100" },
            { label: "Delivered", value: stats.delivered, color: "bg-green-100" },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.color} rounded-xl p-4`}>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order number or customer..."
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter size={16} className="mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-card rounded-xl p-12 text-center shadow-sm border border-border">
            <Package size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No orders found</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allFilteredSelected ? true : someFilteredSelected ? "indeterminate" : false}
                      onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                      aria-label="Select all orders"
                    />
                  </TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="hidden md:table-cell">Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Payment</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id} data-state={selectedIds.has(order.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(order.id)}
                        onCheckedChange={(checked) => toggleOrderSelection(order.id, checked === true)}
                        aria-label={`Select order ${order.order_number}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">#{order.order_number}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div>
                        <p className="font-medium">{order.shipping_address.full_name}</p>
                        <p className="text-sm text-muted-foreground">{order.shipping_address.city}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={order.status}
                        onValueChange={(value) => handleStatusChange(order, value)}
                      >
                        <SelectTrigger className={`w-32 h-8 text-xs ${statusColors[order.status]}`}>
                          <div className="flex items-center gap-1">
                            {statusIcons[order.status]}
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={order.payment_status === "paid" ? "default" : "secondary"}>
                        {order.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">₹{order.total}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {format(new Date(order.created_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => viewOrderDetails(order)}>
                          <Eye size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setOrderToDelete(order)}
                          disabled={isDeleting}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Order Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex flex-wrap items-center justify-between gap-4 pr-8">
                <DialogTitle className="font-display">
                  Order #{selectedOrder?.order_number}
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={printInvoice}>
                    <Printer size={16} className="mr-2" />
                    Print Invoice
                  </Button>
                  {selectedOrder && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setOrderToDelete(selectedOrder)}
                      disabled={isDeleting}
                    >
                      <Trash2 size={16} className="mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                {/* Order Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={statusColors[selectedOrder.status]}>
                      {selectedOrder.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment</p>
                    <Badge variant={selectedOrder.payment_status === "paid" ? "default" : "secondary"}>
                      {selectedOrder.payment_status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Method</p>
                    <p className="font-medium capitalize">{selectedOrder.payment_method}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{format(new Date(selectedOrder.created_at), "dd MMM yyyy, HH:mm")}</p>
                  </div>
                </div>

                {/* Razorpay reference — needed to reconcile or refund in the Razorpay dashboard */}
                {selectedOrder.razorpay_payment_id && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h3 className="font-medium mb-2">Razorpay Reference</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Payment ID</p>
                        <p className="font-mono break-all">{selectedOrder.razorpay_payment_id}</p>
                      </div>
                      {selectedOrder.razorpay_order_id && (
                        <div>
                          <p className="text-muted-foreground">Order ID</p>
                          <p className="font-mono break-all">{selectedOrder.razorpay_order_id}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tracking */}
                {(selectedOrder.courier_name || selectedOrder.tracking_number) && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <h3 className="font-medium">Shipment Tracking</h3>
                      {selectedOrder.status !== "shipped" && (
                        <Button variant="outline" size="sm" onClick={() => openShipDialog(selectedOrder)}>
                          Update tracking
                        </Button>
                      )}
                    </div>
                    <p className="text-sm"><span className="text-muted-foreground">Courier:</span> {selectedOrder.courier_name || "—"}</p>
                    <p className="text-sm"><span className="text-muted-foreground">AWB / Tracking:</span> {selectedOrder.tracking_number || "—"}</p>
                    {selectedOrder.tracking_url && (
                      <a
                        href={selectedOrder.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                      >
                        Open tracking link <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                )}

                {selectedOrder.status !== "shipped" && !selectedOrder.tracking_number && (
                  <Button variant="outline" onClick={() => openShipDialog(selectedOrder)}>
                    <Truck size={16} className="mr-2" />
                    Mark as shipped with tracking
                  </Button>
                )}

                {selectedOrder.status === "shipped" && (
                  <Button variant="outline" onClick={() => openShipDialog(selectedOrder)}>
                    <Truck size={16} className="mr-2" />
                    Update tracking / re-notify
                  </Button>
                )}

                {/* Shipping Address */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Shipping Address</h3>
                  <p>{selectedOrder.shipping_address.full_name}</p>
                  <p className="text-muted-foreground">
                    {selectedOrder.shipping_address.address_line1}
                    {selectedOrder.shipping_address.address_line2 && `, ${selectedOrder.shipping_address.address_line2}`}
                  </p>
                  <p className="text-muted-foreground">
                    {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} - {selectedOrder.shipping_address.pincode}
                  </p>
                  <p className="text-muted-foreground">Phone: {selectedOrder.shipping_address.phone}</p>
                  {(selectedOrder.customer_email || selectedOrder.shipping_address.email) && (
                    <p className="text-muted-foreground">
                      Email: {selectedOrder.customer_email || selectedOrder.shipping_address.email}
                    </p>
                  )}
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="font-medium mb-3">Order Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.order_items?.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 bg-muted/30 rounded-lg p-3">
                        {item.product_image && (
                          <img
                            src={item.product_image}
                            alt={item.product_name}
                            className="w-12 h-12 rounded object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-medium">₹{item.price * item.quantity}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{selectedOrder.subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>₹{selectedOrder.shipping_cost}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t border-border pt-2">
                    <span>Total</span>
                    <span>₹{selectedOrder.total}</span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Single order delete confirmation */}
        <AlertDialog open={!!orderToDelete} onOpenChange={(open) => !open && setOrderToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete order</AlertDialogTitle>
              <AlertDialogDescription>
                Delete order #{orderToDelete?.order_number}? This permanently removes the order
                and its line items. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteSingle}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk delete confirmation */}
        <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedIds.size} orders</AlertDialogTitle>
              <AlertDialogDescription>
                Permanently delete {selectedIds.size} selected order
                {selectedIds.size === 1 ? "" : "s"} and their line items? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteBulk}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting…" : `Delete ${selectedIds.size}`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Ship + tracking + notify */}
        <Dialog
          open={!!shipOrder}
          onOpenChange={(open) => {
            if (!open && !isShipping) {
              setShipOrder(null);
              setWhatsappFallbackUrl(null);
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">
                Ship order #{shipOrder?.order_number}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add courier details. We will email and WhatsApp the customer when you confirm
                (if notification secrets are configured).
              </p>
              <div className="space-y-2">
                <Label htmlFor="courier_name">Courier name *</Label>
                <Input
                  id="courier_name"
                  placeholder="Delhivery, Bluedart, DTDC…"
                  value={shipForm.courier_name}
                  onChange={(e) => setShipForm((prev) => ({ ...prev, courier_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tracking_number">Tracking / AWB *</Label>
                <Input
                  id="tracking_number"
                  placeholder="Tracking number"
                  value={shipForm.tracking_number}
                  onChange={(e) => setShipForm((prev) => ({ ...prev, tracking_number: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tracking_url">Tracking link (optional)</Label>
                <Input
                  id="tracking_url"
                  placeholder="https://…"
                  value={shipForm.tracking_url}
                  onChange={(e) => setShipForm((prev) => ({ ...prev, tracking_url: e.target.value }))}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={shipForm.notify_customer}
                  onCheckedChange={(checked) =>
                    setShipForm((prev) => ({ ...prev, notify_customer: checked === true }))
                  }
                />
                Notify customer by email + WhatsApp
              </label>

              {whatsappFallbackUrl && (
                <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Automatic WhatsApp API is not configured (or failed). Open this pre-filled chat to message the customer:
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <a href={whatsappFallbackUrl} target="_blank" rel="noopener noreferrer">
                      Open WhatsApp message
                    </a>
                  </Button>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  disabled={isShipping}
                  onClick={() => {
                    setShipOrder(null);
                    setWhatsappFallbackUrl(null);
                  }}
                >
                  {whatsappFallbackUrl ? "Done" : "Cancel"}
                </Button>
                {!whatsappFallbackUrl && (
                  <Button onClick={confirmShipOrder} disabled={isShipping}>
                    {isShipping ? "Saving…" : "Ship & notify"}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
};

export default Orders;
