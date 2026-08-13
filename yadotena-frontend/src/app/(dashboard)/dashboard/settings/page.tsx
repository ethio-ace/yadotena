"use client";

import { useFormik } from "formik";
import * as Yup from "yup";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { CheckCircle2, Smartphone, Building2, CreditCard, ShieldCheck } from "lucide-react";
import { api } from "@/services/api";

const SettingsSchema = Yup.object().shape({
  restaurantName: Yup.string().required("Restaurant name is required"),
  phone: Yup.string().required("Phone number is required"),
  address: Yup.string().required("Address is required"),
  serviceChargePercent: Yup.number().min(0).max(100).required("Service charge percentage is required"),
  vatPercent: Yup.number().min(0).max(100).required("VAT percentage is required"),
  telebirrNo: Yup.string().required("Telebirr number is required"),
  telebirrName: Yup.string().required("Telebirr account holder name is required"),
  cbeAccount: Yup.string().required("CBE account number is required"),
  cbeName: Yup.string().required("CBE account holder name is required"),
  boaAccount: Yup.string().required("BOA account number is required"),
  boaName: Yup.string().required("BOA account holder name is required"),
});

export default function SettingsPage() {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const formik = useFormik({
    initialValues: {
      restaurantName: "Yadotena Milk & Foods",
      phone: "+251 91 123 4567",
      address: "Bole Road, Addis Ababa",
      serviceChargePercent: 10,
      vatPercent: 15,
      guestWifiSsid: "Yadotena_Milk_5G",
      guestWifiPassword: "Yadotena2026",
      telebirrNo: "0911234567",
      telebirrName: "Yadotena Milk & Foods PLC",
      cbeAccount: "1000123456789",
      cbeName: "Yadotena Milk & Foods",
      boaAccount: "987654321",
      boaName: "Yadotena Milk & Foods",
      ebirrAccount: "0911234567",
      ebirrName: "Yadotena Milk & Foods PLC",
    },
    validationSchema: SettingsSchema,
    onSubmit: async (values) => {
      try {
        await api.settings.update(values);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      } catch (err: any) {
        alert("Failed to update settings: " + (err.message || "Error"));
      }
    },
  });

  useEffect(() => {
    api.settings.get()
      .then((data) => {
        if (data) {
          formik.setValues({
            restaurantName: data.restaurantName || "Yadotena Milk & Foods",
            phone: data.phone || "+251 91 123 4567",
            address: data.address || "Bole Road, Addis Ababa",
            serviceChargePercent: data.serviceChargePercent ?? 10,
            vatPercent: data.vatPercent ?? 15,
            guestWifiSsid: data.guestWifiSsid || "Yadotena_Milk_5G",
            guestWifiPassword: data.guestWifiPassword || "Yadotena2026",
            telebirrNo: data.telebirrNo || "0911234567",
            telebirrName: data.telebirrName || "Yadotena Milk & Foods PLC",
            cbeAccount: data.cbeAccount || "1000123456789",
            cbeName: data.cbeName || "Yadotena Milk & Foods",
            boaAccount: data.boaAccount || "987654321",
            boaName: data.boaName || "Yadotena Milk & Foods",
            ebirrAccount: data.ebirrAccount || "0911234567",
            ebirrName: data.ebirrName || "Yadotena Milk & Foods PLC",
          });
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 text-center animate-pulse font-bold text-muted-foreground">
        Loading System Settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-500 pb-16">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">System & Digital Payment Settings</h2>
        <p className="text-muted-foreground mt-1">Configure general establishment details and owner digital payment accounts.</p>
      </div>

      <form onSubmit={formik.handleSubmit} className="space-y-6">
        
        {/* General Information */}
        <Card className="rounded-3xl border-muted-foreground/20 shadow-sm">
          <CardHeader>
            <CardTitle>General Establishment Details</CardTitle>
            <CardDescription>
              Basic information displayed on receipts, orders, and customer app headers.
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
          </CardContent>
        </Card>

        {/* Digital Payment Accounts (Owner Settings) */}
        <Card className="rounded-3xl border-primary/30 bg-primary/5 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Owner Digital Payment Accounts</CardTitle>
            </div>
            <CardDescription>
              Set up Telebirr, CBE, and Bank accounts. Waiters and Cashiers will present these exact details to customers when settling digital payments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Telebirr Config */}
            <div className="bg-background p-4 rounded-2xl border space-y-3">
              <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-sm">
                <Smartphone className="h-4 w-4" />
                <span>Telebirr Transfer Details</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Merchant / Phone Number</label>
                  <Input
                    name="telebirrNo"
                    onChange={formik.handleChange}
                    value={formik.values.telebirrNo}
                    className="rounded-xl h-11 font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Account Holder Name</label>
                  <Input
                    name="telebirrName"
                    onChange={formik.handleChange}
                    value={formik.values.telebirrName}
                    className="rounded-xl h-11 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* CBE Config */}
            <div className="bg-background p-4 rounded-2xl border space-y-3">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm">
                <Building2 className="h-4 w-4" />
                <span>Commercial Bank of Ethiopia (CBE)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">CBE Account Number</label>
                  <Input
                    name="cbeAccount"
                    onChange={formik.handleChange}
                    value={formik.values.cbeAccount}
                    className="rounded-xl h-11 font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Account Holder Name</label>
                  <Input
                    name="cbeName"
                    onChange={formik.handleChange}
                    value={formik.values.cbeName}
                    className="rounded-xl h-11 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Bank of Abyssinia (BOA) Config */}
            <div className="bg-background p-4 rounded-2xl border space-y-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <Building2 className="h-4 w-4" />
                <span>Bank of Abyssinia (BOA)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">BOA Account Number</label>
                  <Input
                    name="boaAccount"
                    onChange={formik.handleChange}
                    value={formik.values.boaAccount}
                    className="rounded-xl h-11 font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Account Holder Name</label>
                  <Input
                    name="boaName"
                    onChange={formik.handleChange}
                    value={formik.values.boaName}
                    className="rounded-xl h-11 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Other Mobile Wallet / E-Birr */}
            <div className="bg-background p-4 rounded-2xl border space-y-3">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
                <CreditCard className="h-4 w-4" />
                <span>Other Mobile Wallet (E-Birr / M-PESA)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Account / Merchant Number</label>
                  <Input
                    name="ebirrAccount"
                    onChange={formik.handleChange}
                    value={formik.values.ebirrAccount}
                    className="rounded-xl h-11 font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Account Holder Name</label>
                  <Input
                    name="ebirrName"
                    onChange={formik.handleChange}
                    value={formik.values.ebirrName}
                    className="rounded-xl h-11 font-bold"
                  />
                </div>
              </div>
            </div>

          </CardContent>
          <CardFooter className="flex justify-end border-t p-6">
            <div className="flex items-center gap-4">
              {isSaved && (
                <span className="text-emerald-500 text-sm font-bold flex items-center animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Settings & Payment Accounts Saved!
                </span>
              )}
              <Button type="submit" size="lg" className="rounded-full font-bold shadow-lg shadow-primary/20 px-8" disabled={formik.isSubmitting}>
                {formik.isSubmitting ? "Saving Settings..." : "Save System Settings"}
              </Button>
            </div>
          </CardFooter>
        </Card>

      </form>
    </div>
  );
}
