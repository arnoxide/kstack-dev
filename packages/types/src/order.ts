import { z } from "zod";

export const OrderStatusSchema = z.enum(["pending", "processing", "shipped", "delivered", "cancelled", "refunded"]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const FinancialStatusSchema = z.enum(["pending", "paid", "refunded", "partially_refunded", "failed"]);
export type FinancialStatus = z.infer<typeof FinancialStatusSchema>;

export const AddressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  address1: z.string().min(1),
  address2: z.string().nullable(),
  city: z.string().min(1),
  province: z.string().nullable(),
  zip: z.string().min(1),
  country: z.string().min(2).max(2),
  phone: z.string().nullable(),
});
export type Address = z.infer<typeof AddressSchema>;

export const OrderLineItemSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  tenantId: z.string().uuid(),
  variantId: z.string().uuid().nullable(),
  title: z.string(),
  variantTitle: z.string().nullable(),
  sku: z.string().nullable(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  totalPrice: z.number().min(0),
});
export type OrderLineItem = z.infer<typeof OrderLineItemSchema>;

export const OrderSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  customerId: z.string().uuid().nullable(),
  orderNumber: z.number().int(),
  status: OrderStatusSchema,
  financialStatus: FinancialStatusSchema,
  currency: z.string().length(3),
  subtotal: z.number().min(0),
  taxTotal: z.number().min(0),
  shippingTotal: z.number().min(0),
  total: z.number().min(0),
  shippingAddress: AddressSchema.nullable(),
  billingAddress: AddressSchema.nullable(),
  customerEmail: z.string().email().nullable(),
  note: z.string().nullable(),
  lineItems: z.array(OrderLineItemSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Order = z.infer<typeof OrderSchema>;
