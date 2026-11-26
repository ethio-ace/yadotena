"use client";

import { useFormik } from "formik";
import * as Yup from "yup";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { CheckCircle2, ShieldCheck, Wifi, Lock, Store, AlertTriangle } from "lucide-react";
import { api } from "@/services/api";
import { PaymentMethodsManager } from "@/components/owner/PaymentMethodsManager";

const SettingsSchema = Yup.object().shape({
  restaurantName: Yup.string().required("Restaurant name is required"),
  phone: Yup.string().required("Phone number is required"),
  address: Yup.string().required("Address is required"),
  serviceChargePercent: Yup.number().min(0).max(100).required("Service charge percentage is required"),
  vatPercent: Yup.number().min(0).max(100).required("VAT percentage is required"),
  deliveryFee: Yup.number().min(0).required("Delivery fee is required"),
  requireTableQrKey: Yup.boolean(),
  deliveryEnabled: Yup.boolean(),
  deliveryStartTime: Yup.string(),
  deliveryEndTime: Yup.string(),
  guestWifiSsid: Yup.string(),
  guestWifiPassword: Yup.string(),
});

export default function SettingsPage() {
  const { data: session } = useSession();
  const role = (session?.user?.role || "").toUpperCase();
  const isOwner = role === "OWNER";

  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const formik = useFormik({
    initialValues: {
      restaurantName: "Hilif Milk & Foods",
      phone: "+251 91 123 4567",
      address: "Bole Road, Addis Ababa",
      serviceChargePercent: 10,
      vatPercent: 0,
      deliveryFee: 100,
      requireTableQrKey: false,
      deliveryEnabled: false,
      deliveryStartTime: "",
      deliveryEndTime: "",
      guestWifiSsid: "Hilif_Milk_5G",
      guestWifiPassword: "",
    },
    validationSchema: SettingsSchema,
    onSubmit: async (values) => {
      try {
        // Empty time inputs mean "no limit" on the server.
        await api.settings.update({
          ...values,
          deliveryStartTime: values.deliveryStartTime || null,
          deliveryEndTime: values.deliveryEndTime || null,
        });
        setSaveError(null);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Failed to update settings");
      }
    },
  });

  useEffect(() => {
    api.settings
      .get()
      .then((data) => {
        if (data) {
          formik.setValues({
            restaurantName: data.restaurantName || "Hilif Milk & Foods",
            phone: data.phone || "+251 91 123 4567",
            address: data.address || "Bole Road, Addis Ababa",
            serviceChargePercent: data.serviceChargePercent ?? 10,
            vatPercent: data.vatPercent ?? 0,
            deliveryFee: data.deliveryFee ?? 100,
            requireTableQrKey: !!data.requireTableQrKey,
            deliveryEnabled: !!data.deliveryEnabled,
            deliveryStartTime: data.deliveryStartTime || "",
            deliveryEndTime: data.deliveryEndTime || "",
            guestWifiSsid: data.guestWifiSsid || "Hilif_Milk_5G",
            guestWifiPassword: data.guestWifiPassword || "",
          });
        }
      })
      .catch(() => setLoadError(true))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 text-center animate-pulse font-bold text-muted-foreground">
        Loading System Settings...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6 rounded-2xl border border-destructive/30 bg-destructive/5 text-destructive text-xs font-bold max-w-xl animate-in fade-in duration-200">
Couldn’t load store settings. Check your connection and refresh to try again.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-500 pb-16">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Store Settings</h2>
        <p className="text-muted-foreground mt-1">
          Business details, tax & charges, guest Wi-Fi, and the digital payment accounts waiters present at settlement.
        </p>
      </div>

      {/* General Information */}
      <form onSubmit={formik.handleSubmit}>
      <Card className="rounded-3xl border-muted-foreground/20 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <CardTitle>General Establishment Details</CardTitle>
          </div>
          <CardDescription>
            Basic information displayed on receipts, waiter tickets, and invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="restaurantName" className="text-sm font-semibold">Restaurant Name</label>
            <Input
              id="restaurantName"
              name="restaurantName"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.restaurantName}
              className="rounded-xl h-11"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-semibold">Phone Number</label>
              <Input
                id="phone"
                name="phone"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.phone}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="serviceChargePercent" className="text-sm font-semibold">Service Charge (%)</label>
              <Input
                id="serviceChargePercent"
                name="serviceChargePercent"
                type="number"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.serviceChargePercent}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="vatPercent" className="text-sm font-semibold">VAT (%)</label>
              <Input
                id="vatPercent"
                name="vatPercent"
                type="number"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.vatPercent}
                className="rounded-xl h-11"
              />
              <p className="text-[11px] text-muted-foreground">
                Keep at 0 unless the café is VAT-registered — only registered businesses may charge VAT.
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="deliveryFee" className="text-sm font-semibold">Delivery fee (ETB)</label>
              <Input
                id="deliveryFee"
                name="deliveryFee"
                type="number"
                min={0}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.deliveryFee}
                className="rounded-xl h-11"
              />
              <p className="text-[11px] text-muted-foreground">Added once to every delivery order.</p>
            </div>
          </div>

          <label className="flex items-start gap-3 p-4 rounded-xl border cursor-pointer">
            <input
              type="checkbox"
              name="requireTableQrKey"
              checked={formik.values.requireTableQrKey}
              onChange={formik.handleChange}
              className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
            />
            <span>
              <span className="block text-sm font-semibold">Guests must scan the table QR to order</span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">
                Stops people ordering to a table by typing its number. Turn this on only after the new QR codes
                (Tables → QR code, printed after this update) are on every table — old printed codes stop working for ordering.
              </span>
            </span>
          </label>

          <div className="p-4 rounded-xl border space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="deliveryEnabled"
                checked={formik.values.deliveryEnabled}
                onChange={formik.handleChange}
                className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
              />
              <span>
                <span className="block text-sm font-semibold">Take delivery orders on the website</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">
                  Customers get a “Delivery” option on the menu (share{" "}
                  <span className="font-mono">{typeof window !== "undefined" ? window.location.origin : ""}/menu?mode=delivery</span>).
                  Every website delivery waits in the waiter&apos;s “Guest orders” until staff call the customer and approve it.
                  Turn off on days without a rider. Staff can always take phone delivery orders.
                </span>
              </span>
            </label>
            {formik.values.deliveryEnabled && (
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                <div className="space-y-1">
                  <label htmlFor="deliveryStartTime" className="text-xs font-semibold">Delivery from</label>
                  <Input id="deliveryStartTime" name="deliveryStartTime" type="time" value={formik.values.deliveryStartTime} onChange={formik.handleChange} className="rounded-xl h-11" />
                </div>
                <div className="space-y-1">
                  <label htmlFor="deliveryEndTime" className="text-xs font-semibold">until</label>
                  <Input id="deliveryEndTime" name="deliveryEndTime" type="time" value={formik.values.deliveryEndTime} onChange={formik.handleChange} className="rounded-xl h-11" />
                </div>
                <p className="col-span-2 text-[11px] text-muted-foreground">
                  Addis time. Leave both empty to accept delivery whenever it&apos;s switched on. A window like 18:00 → 02:00 runs past midnight.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="address" className="text-sm font-semibold">Physical Address</label>
            <Input
              id="address"
              name="address"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.address}
              className="rounded-xl h-11"
            />
          </div>

          {/* Guest Wi-Fi — already stored in the database, now editable here. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
            <div className="space-y-2">
              <label htmlFor="guestWifiSsid" className="text-sm font-semibold flex items-center gap-1.5">
                <Wifi className="h-4 w-4 text-primary" /> Guest Wi-Fi Network (SSID)
              </label>
              <Input
                id="guestWifiSsid"
                name="guestWifiSsid"
                onChange={formik.handleChange}
                value={formik.values.guestWifiSsid}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="guestWifiPassword" className="text-sm font-semibold flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-primary" /> Guest Wi-Fi Password
              </label>
              <Input
                id="guestWifiPassword"
                name="guestWifiPassword"
                onChange={formik.handleChange}
                value={formik.values.guestWifiPassword}
                placeholder="Leave empty to keep the current password"
                className="rounded-xl h-11"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t p-6">
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
            {saveError && (
              <span className="text-destructive text-xs font-bold flex items-center animate-in fade-in">
                <AlertTriangle className="h-4 w-4 mr-1 shrink-0" />
                {saveError}
              </span>
            )}
            {isSaved && (
              <span className="text-emerald-500 text-sm font-bold flex items-center animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Store settings saved!
              </span>
            )}
            <Button type="submit" size="lg" className="rounded-full font-bold shadow-lg shadow-primary/20 px-8" disabled={formik.isSubmitting}>
              {formik.isSubmitting ? "Saving Settings..." : "Save Store Settings"}
            </Button>
          </div>
        </CardFooter>
      </Card>
      </form>

      {/* Digital Payment Accounts — real DB rows, owner-only */}
      {isOwner ? (
        <Card className="rounded-3xl border-primary/30 bg-primary/5 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Owner Digital Payment Accounts</CardTitle>
            </div>
            <CardDescription>
              Set up Telebirr, CBE, and bank accounts. Waiters and cashiers present these exact details to customers when settling digital payments — stored in the database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentMethodsManager />
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-3xl border border-amber-500/30 bg-amber-500/5 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-foreground">Owner Access Required</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Digital payment accounts are configured by the business owner only. Ask the owner to review them.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
