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
      restaurantName: "Yadotena Milk & Foods",
      phone: "+251 91 123 4567",
      address: "Bole Road, Addis Ababa",
      serviceChargePercent: 10,
      vatPercent: 15,
      guestWifiSsid: "Yadotena_Milk_5G",
      guestWifiPassword: "",
    },
    validationSchema: SettingsSchema,
    onSubmit: async (values) => {
      try {
        await api.settings.update(values);
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
            restaurantName: data.restaurantName || "Yadotena Milk & Foods",
            phone: data.phone || "+251 91 123 4567",
            address: data.address || "Bole Road, Addis Ababa",
            serviceChargePercent: data.serviceChargePercent ?? 10,
            vatPercent: data.vatPercent ?? 15,
            guestWifiSsid: data.guestWifiSsid || "Yadotena_Milk_5G",
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
              <label htmlFor="vatPercent" className="text-sm font-semibold">VAT Sales Tax (%)</label>
              <Input
                id="vatPercent"
                name="vatPercent"
                type="number"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.vatPercent}
                className="rounded-xl h-11"
              />
            </div>
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
