import { api } from "@/lib/api";
import { notFound } from "next/navigation";
import { ContactForm } from "./contact-form";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let shop: Awaited<ReturnType<typeof api.public.resolveShop.query>>;
  try {
    shop = await api.public.resolveShop.query({ slug });
  } catch {
    notFound();
  }

  const info = shop.tenant.contactInfo;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Contact Us</h1>
        <p className="text-gray-500 mt-2">We'd love to hear from you. Send us a message and we'll get back to you soon.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Contact details */}
        <div className="lg:col-span-2 space-y-6">
          {(info?.address || info?.city || info?.country) && (
            <div className="flex gap-3">
              <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0 h-fit">
                <MapPin className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Address</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {[info?.address, info?.city, info?.country].filter(Boolean).join(", ")}
                </p>
              </div>
            </div>
          )}

          {info?.phone && (
            <div className="flex gap-3">
              <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0 h-fit">
                <Phone className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Phone</p>
                <a href={`tel:${info.phone}`} className="text-sm text-gray-500 hover:text-gray-900 mt-0.5 block">
                  {info.phone}
                </a>
              </div>
            </div>
          )}

          {(info?.supportEmail || shop.tenant.email) && (
            <div className="flex gap-3">
              <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0 h-fit">
                <Mail className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Email</p>
                <a
                  href={`mailto:${info?.supportEmail ?? shop.tenant.email}`}
                  className="text-sm text-gray-500 hover:text-gray-900 mt-0.5 block"
                >
                  {info?.supportEmail ?? shop.tenant.email}
                </a>
              </div>
            </div>
          )}

          {info?.businessHours && (
            <div className="flex gap-3">
              <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0 h-fit">
                <Clock className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Business Hours</p>
                <p className="text-sm text-gray-500 mt-0.5 whitespace-pre-line">{info.businessHours}</p>
              </div>
            </div>
          )}

          {/* Fallback if nothing configured */}
          {!info?.address && !info?.phone && !info?.supportEmail && !info?.businessHours && (
            <div className="flex gap-3">
              <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0 h-fit">
                <Mail className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Email</p>
                <a href={`mailto:${shop.tenant.email}`} className="text-sm text-gray-500 hover:text-gray-900 mt-0.5 block">
                  {shop.tenant.email}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Contact form */}
        <div className="lg:col-span-3">
          <ContactForm tenantId={shop.tenant.id} />
        </div>
      </div>
    </div>
  );
}
