import { z } from "zod";
import { httpError } from "./auth.js";

const trimmedText = z.string().trim();
const optionalText = trimmedText.optional().default("");
const stringArray = z.array(z.string()).optional().default([]);
const requiredText = (message: string) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z.string().min(1, message),
  );

export function parseInput<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const message = result.error.issues[0]?.message || "Invalid request";
  throw httpError(message);
}

export const clientErrorSchema = z
  .object({
    message: optionalText,
    name: optionalText,
    path: optionalText,
    source: optionalText,
    userAgent: optionalText,
    stack: optionalText,
    componentStack: optionalText,
  })
  .passthrough();

export const productListQuerySchema = z
  .object({
    category: optionalText,
    q: optionalText,
    flag: optionalText,
    sort: optionalText.default("featured"),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(24),
  })
  .passthrough();

export const adminOrderListQuerySchema = z
  .object({
    status: optionalText,
    email: optionalText,
    from: optionalText,
    to: optionalText,
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(25),
  })
  .passthrough();

export const addCartItemSchema = z.object({
  productId: requiredText("productId is required"),
  quantity: z.coerce.number().int().positive().default(1),
  selectedColor: optionalText,
  selectedSize: optionalText,
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(0, "quantity must be 0 or greater"),
});

export const couponValidationSchema = z.object({
  code: trimmedText,
});

export const billingSchema = z
  .object({
    firstName: requiredText("Missing billing fields: firstName"),
    streetAddress: requiredText("Missing billing fields: streetAddress"),
    townCity: requiredText("Missing billing fields: townCity"),
    phone: requiredText("Missing billing fields: phone"),
    email: requiredText("Missing billing fields: email"),
  })
  .passthrough();

export const createOrderSchema = z.object({
  billing: billingSchema,
  paymentMethod: optionalText.default("bank"),
  couponCode: optionalText.optional(),
  idempotencyKey: optionalText.optional(),
});

export const createPaymentSchema = z.object({
  orderId: requiredText("orderId is required"),
  paymentMethod: optionalText.default("bank"),
});

export const contactSchema = z.object({
  name: requiredText("Name, email, and message are required"),
  email: requiredText("Name, email, and message are required"),
  phone: optionalText,
  message: requiredText("Name, email, and message are required"),
});

export const adminOrderUpdateSchema = z
  .object({
    status: z.string().trim().optional(),
    internalNote: z.string().optional(),
  })
  .passthrough();

export const adminProductSchema = z
  .object({
    name: requiredText("Product name is required"),
    category: requiredText("Product category is required"),
    description: optionalText,
    price: z.coerce.number().nonnegative(),
    originalPrice: z.coerce.number().nonnegative().default(0),
    discountPercent: z.coerce.number().nonnegative().default(0),
    rating: z.coerce.number().nonnegative().default(0),
    reviewCount: z.coerce.number().int().nonnegative().default(0),
    stockStatus: optionalText.default("In Stock"),
    colors: stringArray,
    sizes: stringArray,
    isNew: z.coerce.boolean().default(false),
    flags: stringArray,
    image: optionalText.default("default"),
  })
  .passthrough();

export const adminProductUpdateSchema = adminProductSchema.partial().passthrough();

export const adminProductVariantSchema = z
  .object({
    id: optionalText,
    sku: optionalText,
    color: optionalText,
    size: optionalText,
    stock: z.coerce.number().int("Stock must be a whole number").nonnegative("Stock must be a non-negative integer"),
  })
  .passthrough();

export const adminProductVariantsSchema = z
  .object({
    variants: z.array(adminProductVariantSchema),
  })
  .passthrough();

export const adminCategorySchema = z
  .object({
    label: requiredText("Category label is required"),
    slug: requiredText("Category slug is required"),
    icon: optionalText,
    children: stringArray,
    sortOrder: z.coerce.number().int().default(0),
    parentId: z.string().nullable().optional().default(null),
  })
  .passthrough();

export const adminCategoryUpdateSchema = adminCategorySchema.partial().passthrough();

export const adminCouponSchema = z
  .object({
    code: requiredText("Coupon code is required"),
  })
  .passthrough();

export const contactMessageStatusSchema = z.object({
  status: requiredText("Status is required"),
});
