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
});

export default function SettingsPage() {
  const [isSaved, setIsSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: api.settings.get,
  });

  const saveSettings = useMutation({
    mutationFn: api.settings.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    },
    onError: (err: Error) => {
      alert(err.message || "Failed to save settings (owner role required)");
    },
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      restaurantName: String(settings?.cafe_name || "Yadotena Cafe & Resto"),
      phone: String(settings?.cafe_phone || ""),
      address: String(settings?.cafe_address || ""),
      serviceCharge: Number(settings?.service_charge_percent ?? 10),
    },
    validationSchema: SettingsSchema,
    onSubmit: async (values) => {
      await saveSettings.mutateAsync({
        cafe_name: values.restaurantName,
        cafe_phone: values.phone,
        cafe_address: values.address,
        service_charge_percent: Number(values.serviceCharge),
      });
    },
  });

  useEffect(() => {
    if (settings) {
      formik.setValues({
        restaurantName: String(settings.cafe_name || ""),
        phone: String(settings.cafe_phone || ""),
        address: String(settings.cafe_address || ""),
        serviceCharge: Number(settings.service_charge_percent ?? 10),
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

      <form onSubmit={formik.handleSubmit}>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div className="space-y-2">
                <label htmlFor="serviceCharge" className="text-sm font-medium">Service Charge (%)</label>
                <Input
                  id="serviceCharge"
                  name="serviceCharge"
                  type="number"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.serviceCharge}
                  className={formik.errors.serviceCharge && formik.touched.serviceCharge ? "border-destructive" : ""}
                />
                {formik.errors.serviceCharge && formik.touched.serviceCharge && (
                  <div className="text-destructive text-sm mt-1">{formik.errors.serviceCharge}</div>
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
          <CardFooter className="flex justify-end border-t p-6">
            <div className="flex items-center gap-4">
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
