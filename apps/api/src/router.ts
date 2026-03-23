import { router } from "./trpc";
import { aiAssistantRouter } from "./routers/aiAssistant";
import { authRouter } from "./routers/auth";
import { emailRouter } from "./routers/email";
import { collectionsRouter } from "./routers/collections";
import { customerAuthRouter } from "./routers/customerAuth";
import { couponsRouter } from "./routers/coupons";
import { integrationsRouter } from "./routers/integrations";
import { ordersRouter } from "./routers/orders";
import { productsRouter } from "./routers/products";
import { publicRouter } from "./routers/public";
import { reviewsRouter } from "./routers/reviews";
import { shippingRouter } from "./routers/shipping";
import { storefrontRouter } from "./routers/storefront";
import { tenantRouter } from "./routers/tenant";

export const appRouter = router({
  aiAssistant: aiAssistantRouter,
  auth: authRouter,
  email: emailRouter,
  collections: collectionsRouter,
  customerAuth: customerAuthRouter,
  coupons: couponsRouter,
  integrations: integrationsRouter,
  products: productsRouter,
  orders: ordersRouter,
  reviews: reviewsRouter,
  shipping: shippingRouter,
  storefront: storefrontRouter,
  tenant: tenantRouter,
  public: publicRouter,
});


export type AppRouter = typeof appRouter;
