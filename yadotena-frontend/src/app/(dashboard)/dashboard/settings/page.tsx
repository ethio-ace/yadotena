"use client";

import { useEffect, useState } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";
import { api } from "@/services/api";

const SettingsSchema = Yup.object().shape({
  restaurantName: Yup.string()
    .min(2, "Name is too short")
    .max(50, "Name is too long")
    .required("Restaurant name is required"),
  phone: Yup.string()
    .matches(/^[0-9+\-\s()]*$/, "Invalid phone number format")
    .required("Phone number is required"),
  address: Yup.string().required("Address is required"),
  serviceCharge: Yup.number()
    .min(0, "Service charge cannot be negative")
    .max(100, "Service charge cannot exceed 100%")
    .required("Service charge percentage is required"),
  taxPercent: Yup.number()
    .min(0, "Tax cannot be negative")
    .max(100, "Tax cannot exceed 100%")
    .required("Tax percentage is required"),
  deliveryFee: Yup.number()
    .min(0, "Delivery fee cannot be negative")
    .required("Delivery fee is required"),
  acceptingOrders: Yup.boolean().required(),
  cashEnabled: Yup.boolean().required(),
  digitalEnabled: Yup.boolean().required(),
  digitalMethods: Yup.string(),
});

function methodsFromSettings(settings?: Record<string, unknown> | null): string {
  const raw = settings?.digital_methods;
  if (Array.isArray(raw)) {
    return raw.filter((m): m is string => typeof m === "string").join(", ");
  }
  return "Telebirr, CBE";
}

export default function SettingsPage() {
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: api.settings.get,
  });

  const saveSettings = useMutation({
    mutationFn: api.settings.update,
    onSuccess: () => {
      setSaveError("");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-settings"] });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    },
    onError: (err: Error) => {
      setSaveError(err.message || "Failed to save settings (owner role required)");
    },
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      restaurantName: String(settings?.cafe_name || "Yadotena Milk & Foods"),
      phone: String(settings?.cafe_phone || ""),
      address: String(settings?.cafe_address || ""),
      serviceCharge: Number(settings?.service_charge_percent ?? 0),
      taxPercent: Number(settings?.tax_percent ?? 15),
      deliveryFee: Number(settings?.delivery_fee_etb ?? 100),
      acceptingOrders: settings?.accepting_orders !== false,
      cashEnabled: settings?.cash_enabled !== false,
      digitalEnabled: settings?.digital_enabled !== false,
      digitalMethods: methodsFromSettings(settings),
    },
    validationSchema: SettingsSchema,
    onSubmit: async (values) => {
      const methods = values.digitalMethods
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);
      await saveSettings.mutateAsync({
        cafe_name: values.restaurantName,
        cafe_phone: values.phone,
        cafe_address: values.address,
        service_charge_percent: Number(values.serviceCharge),
        tax_percent: Number(values.taxPercent),
        delivery_fee_etb: Number(values.deliveryFee),
        accepting_orders: values.acceptingOrders,
        cash_enabled: values.cashEnabled,
        digital_enabled: values.digitalEnabled,
        digital_methods: methods,
      });
    },
  });

  useEffect(() => {
    if (settings) {
      formik.setValues({
        restaurantName: String(settings.cafe_name || ""),
        phone: String(settings.cafe_phone || ""),
        address: String(settings.cafe_address || ""),
        serviceCharge: Number(settings.service_charge_percent ?? 0),
        taxPercent: Number(settings.tax_percent ?? 15),
        deliveryFee: Number(settings.delivery_fee_etb ?? 100),
        acceptingOrders: settings.accepting_orders !== false,
        cashEnabled: settings.cash_enabled !== false,
        digitalEnabled: settings.digital_enabled !== false,
        digitalMethods: methodsFromSettings(settings),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Loading settings…</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your restaurant configuration.</p>
      </div>

      <form onSubmit={formik.handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
            <CardDescription>
              Updates sync to the live API (owner can save).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="restaurantName" className="text-sm font-medium">Restaurant Name</label>
              <Input
                id="restaurantName"
                name="restaurantName"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.restaurantName}
                className={formik.errors.restaurantName && formik.touched.restaurantName ? "border-destructive" : ""}
              />
              {formik.errors.restaurantName && formik.touched.restaurantName && (
                <div className="text-destructive text-sm mt-1">{formik.errors.restaurantName}</div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
              <Input
                id="phone"
                name="phone"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.phone}
                className={formik.errors.phone && formik.touched.phone ? "border-destructive" : ""}
              />
              {formik.errors.phone && formik.touched.phone && (
                <div className="text-destructive text-sm mt-1">{formik.errors.phone}</div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label htmlFor="serviceCharge" className="text-sm font-medium">Service charge (%)</label>
                <Input
                  id="serviceCharge"
                  name="serviceCharge"
                  type="number"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.serviceCharge}
                />
                {formik.errors.serviceCharge && formik.touched.serviceCharge && (
                  <div className="text-destructive text-sm mt-1">{formik.errors.serviceCharge}</div>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="taxPercent" className="text-sm font-medium">Tax (%)</label>
                <Input
                  id="taxPercent"
                  name="taxPercent"
                  type="number"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.taxPercent}
                />
                {formik.errors.taxPercent && formik.touched.taxPercent && (
                  <div className="text-destructive text-sm mt-1">{formik.errors.taxPercent}</div>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="deliveryFee" className="text-sm font-medium">Delivery fee (ETB)</label>
                <Input
                  id="deliveryFee"
                  name="deliveryFee"
                  type="number"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.deliveryFee}
                />
                {formik.errors.deliveryFee && formik.touched.deliveryFee && (
                  <div className="text-destructive text-sm mt-1">{formik.errors.deliveryFee}</div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="address" className="text-sm font-medium">Address</label>
              <Input
                id="address"
                name="address"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.address}
                className={formik.errors.address && formik.touched.address ? "border-destructive" : ""}
              />
              {formik.errors.address && formik.touched.address && (
                <div className="text-destructive text-sm mt-1">{formik.errors.address}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ordering & payments</CardTitle>
            <CardDescription>
              Pause public ordering or choose which guest payment methods appear at checkout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-3 rounded-2xl border p-4 cursor-pointer hover:bg-muted/40">
              <input
                type="checkbox"
                name="acceptingOrders"
                checked={formik.values.acceptingOrders}
                onChange={formik.handleChange}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-semibold">Accepting orders</span>
                <span className="text-xs text-muted-foreground">
                  When off, guests cannot place menu or shop orders (staff POS still works).
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border p-4 cursor-pointer hover:bg-muted/40">
              <input
                type="checkbox"
                name="cashEnabled"
                checked={formik.values.cashEnabled}
                onChange={formik.handleChange}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-semibold">Cash at checkout</span>
                <span className="text-xs text-muted-foreground">
                  Show cash as a guest payment option (dine-in still settles with staff).
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border p-4 cursor-pointer hover:bg-muted/40">
              <input
                type="checkbox"
                name="digitalEnabled"
                checked={formik.values.digitalEnabled}
                onChange={formik.handleChange}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-semibold">Digital payments</span>
                <span className="text-xs text-muted-foreground">
                  Let guests submit a transfer reference for staff verification.
                </span>
              </span>
            </label>

            <div className="space-y-2">
              <label htmlFor="digitalMethods" className="text-sm font-medium">
                Digital methods (comma-separated)
              </label>
              <Input
                id="digitalMethods"
                name="digitalMethods"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.digitalMethods}
                placeholder="Telebirr, CBE"
                disabled={!formik.values.digitalEnabled}
              />
              <p className="text-xs text-muted-foreground">
                Labels shown on guest checkout when digital is enabled.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t p-6">
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full sm:w-auto">
              {saveError ? (
                <p className="text-sm text-destructive max-w-sm sm:text-right">{saveError}</p>
              ) : null}
              {isSaved && (
                <span className="text-emerald-500 text-sm font-medium flex items-center animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Saved successfully
                </span>
              )}
              <Button type="submit" disabled={formik.isSubmitting || saveSettings.isPending || !formik.isValid}>
                {formik.isSubmitting || saveSettings.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
