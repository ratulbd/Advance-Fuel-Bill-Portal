import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { format } from "date-fns";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  LogOut,
  CheckCircle,
  Clock,
  AlertCircle,
  ImageIcon,
  Send,
  ZoomIn,
  FileImage,
  Fuel,
  ChevronRight,
  ZoomOut,
  RotateCcw,
} from "lucide-react";

interface TierStatus {
  name: string;
  receiveDate: string | null;
  submitDate: string | null;
  completed: boolean;
}

interface RecordData {
  type: "fuel_bill" | "petty_cash";
  sl: string;
  subCenterName: string;
  circleName: string;
  billingType?: string;
  purchaseType?: string;
  billPeriod: string;
  billSubmitAmount: string;
  billSentDate: string | null;
  topSheetImage: string;
  fieldRemarks: string;
  tiers: TierStatus[];
}

function convertDriveUrl(url: string): string {
  if (!url) return "";
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w1000`;
  const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return `https://drive.google.com/thumbnail?id=${openMatch[1]}&sz=w1000`;
  return url;
}

function formatSheetDate(value: string | null): string | null {
  if (!value) return null;
  const str = value.toString().trim();
  if (!str) return null;

  // Handle YYYY-MM-DD from backend
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str + "T00:00:00");
    if (!isNaN(d.getTime())) return format(d, "dd MMM yyyy");
  }

  // Handle serial numbers (e.g. 45994) BEFORE generic Date parsing
  const serial = Number(str);
  if (!isNaN(serial) && serial > 30000 && serial < 50000) {
    const epoch = new Date(1899, 11, 30);
    const fixed = new Date(epoch.getTime() + serial * 86400000);
    return format(fixed, "dd MMM yyyy");
  }

  // Try parsing as a generic Date
  const d = new Date(str);
  if (!isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2100) {
    return format(d, "dd MMM yyyy");
  }

  return str;
}

export default function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth({ redirectOnUnauthenticated: true });
  const initialRecord: RecordData | null = location.state?.data || null;
  const otherMatch: RecordData | null = location.state?.otherMatch || null;

  const [activeRecord, setActiveRecord] = useState<RecordData | null>(initialRecord);
  const record = activeRecord || initialRecord;

  const [formData, setFormData] = useState({
    dieselAg: "0",
    octanePg: "0",
    petrolPg: "0",
    dieselVehicle: "0",
    purchaseSource: "",
    pumpName: "",
    amountReturnViaBank: "0",
    remarks: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [imgZoom, setImgZoom] = useState(1);

  // Reset image state when switching records
  useEffect(() => {
    setImgLoading(true);
    setImgError(false);
    setImgZoom(1);
  }, [record?.topSheetImage]);

  const submitMutation = trpc.sheets.submit.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setSubmitSuccess(true);
      } else {
        setFormErrors({ submit: data.message || "Submit failed" });
      }
    },
    onError: (error) => {
      setFormErrors({ submit: error.message || "Submit failed" });
    },
  });

  if (!record) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-2" />
            <CardTitle>No Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">Please search for a tracking number first.</p>
            <Button onClick={() => navigate("/")}>Go to Search</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const validateForm = () => {
    const errors: Record<string, string> = {};
    const numericFields = ["dieselAg", "octanePg", "petrolPg", "dieselVehicle", "amountReturnViaBank"];

    for (const field of numericFields) {
      const value = formData[field as keyof typeof formData];
      if (value === "" || value === undefined) {
        errors[field] = "This field is required. Enter 0 if not applicable.";
      } else if (isNaN(Number(value)) || Number(value) < 0) {
        errors[field] = "Please enter a valid number (0 or greater).";
      }
    }

    if (!formData.purchaseSource) {
      errors.purchaseSource = "Please select a purchase source.";
    }

    if (formData.purchaseSource === "Cash purchase from enlisted pump" && !formData.pumpName.trim()) {
      errors.pumpName = "Pump name is required for cash purchase from enlisted pump.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSubmitSuccess(false);

    if (!validateForm()) return;

    submitMutation.mutate({
      sl: record.sl,
      type: record.type,
      dieselAg: Number(formData.dieselAg),
      octanePg: Number(formData.octanePg),
      petrolPg: Number(formData.petrolPg),
      dieselVehicle: Number(formData.dieselVehicle),
      purchaseSource: formData.purchaseSource as "Cash purchase from enlisted pump" | "Local Purchase",
      pumpName: formData.pumpName,
      amountReturnViaBank: Number(formData.amountReturnViaBank),
      remarks: formData.remarks,
    });
  };

  const isFuelBill = record.type === "fuel_bill";
  const typeLabel = isFuelBill ? "Fuel Bill" : "Petty Cash";
  const typeColor = isFuelBill
    ? "bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 border-orange-200"
    : "bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border-emerald-200";

  // Determine active tier index
  const activeTierIndex = record.tiers.findIndex((t) => !t.completed);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <h1 className="font-bold text-slate-800 text-lg">Tracking Details</h1>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8 ring-2 ring-slate-100">
              <AvatarImage src={user?.avatar || ""} />
              <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                {user?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Record Details Card */}
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-slate-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-xl">Bill Information</CardTitle>
              <div className="flex items-center gap-2">
                {otherMatch && (
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                    <button
                      onClick={() => setActiveRecord(initialRecord)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        record.type === "fuel_bill"
                          ? "bg-white text-orange-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <Fuel className="w-3.5 h-3.5" />
                      Fuel Bill
                    </button>
                    <button
                      onClick={() => setActiveRecord(otherMatch)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        record.type === "petty_cash"
                          ? "bg-white text-emerald-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <FileImage className="w-3.5 h-3.5" />
                      Petty Cash
                    </button>
                  </div>
                )}
                {!otherMatch && (
                  <Badge variant="outline" className={typeColor}>
                    {typeLabel}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500 uppercase tracking-wider">BTS Tracker Number</Label>
                <p className="font-semibold text-slate-800">{record.sl}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Circle Name</Label>
                <p className="font-semibold text-slate-800">{record.circleName || "—"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Sub Center Name</Label>
                <p className="font-semibold text-slate-800">{record.subCenterName || "—"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500 uppercase tracking-wider">
                  {isFuelBill ? "Billing Type" : "Purchase Type"}
                </Label>
                <p className="font-semibold text-slate-800">
                  {isFuelBill ? record.billingType : record.purchaseType || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Bill Period</Label>
                <p className="font-semibold text-slate-800">{record.billPeriod || "—"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Bill Sent Date</Label>
                <p className="font-semibold text-slate-800">{formatSheetDate(record.billSentDate) || "—"}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Bill Submit Amount</Label>
                <p className="font-semibold text-slate-800">
                  {record.billSubmitAmount
                    ? `৳ ${Number(record.billSubmitAmount).toLocaleString("en-BD")}`
                    : "—"}
                </p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Field Remarks</Label>
                <p className="text-slate-700 bg-slate-50 p-2 rounded-md border border-slate-100">
                  {record.fieldRemarks || "—"}
                </p>
              </div>

              {record.topSheetImage && (
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs text-slate-500 uppercase tracking-wider">Bill Top Sheet</Label>
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="relative group cursor-pointer max-w-xs">
                        {imgLoading && !imgError && (
                          <Skeleton className="w-full h-32 rounded-lg" />
                        )}
                        {!imgError ? (
                          <img
                            src={convertDriveUrl(record.topSheetImage)}
                            alt="Bill Top Sheet"
                            className={`w-full h-32 object-cover rounded-lg border border-slate-200 transition-transform duration-300 group-hover:scale-[1.02] ${
                              imgLoading ? "hidden" : "block"
                            }`}
                            onLoad={() => setImgLoading(false)}
                            onError={() => {
                              setImgLoading(false);
                              setImgError(true);
                            }}
                          />
                        ) : null}
                        {!imgError && (
                          <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ZoomIn className="w-8 h-8 text-white" />
                          </div>
                        )}
                        {imgError && (
                          <div className="w-full h-32 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-2 text-slate-400">
                            <FileImage className="w-8 h-8" />
                            <span className="text-sm">Unable to load image</span>
                          </div>
                        )}
                      </div>
                    </DialogTrigger>
                    {!imgError && (
                      <DialogContent className="max-w-5xl p-0 bg-slate-900/95 border-slate-700 backdrop-blur-sm">
                        <div className="flex flex-col h-[90vh]">
                          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                            <p className="text-sm text-slate-300 font-medium">Bill Top Sheet</p>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700"
                                onClick={() => setImgZoom((z) => Math.min(z + 0.25, 3))}
                              >
                                <ZoomIn className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700"
                                onClick={() => setImgZoom((z) => Math.max(z - 0.25, 0.5))}
                              >
                                <ZoomOut className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-700"
                                onClick={() => setImgZoom(1)}
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                            <img
                              src={convertDriveUrl(record.topSheetImage)}
                              alt="Bill Top Sheet Enlarged"
                              className="rounded-lg shadow-2xl transition-transform duration-200"
                              style={{ transform: `scale(${imgZoom})`, maxWidth: "100%", objectFit: "contain" }}
                              draggable={false}
                            />
                          </div>
                        </div>
                      </DialogContent>
                    )}
                  </Dialog>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Approval Workflow Card */}
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-slate-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Current Position</CardTitle>
            <p className="text-sm text-slate-500">
              {isFuelBill ? "4-Tier Approval Workflow" : "3-Tier Approval Workflow"}
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-2">
              {record.tiers.map((tier, index) => {
                const isLast = index === record.tiers.length - 1;
                const isActive = index === activeTierIndex;
                const isCompleted = tier.completed;
                const isPending = !isCompleted && !isActive;

                let circleClass = "bg-slate-200 text-slate-500";
                let icon = <span className="text-sm font-bold">{index + 1}</span>;

                if (isCompleted) {
                  circleClass = "bg-green-500 text-white shadow-green-200 shadow-lg";
                  icon = <CheckCircle className="w-5 h-5" />;
                } else if (isActive) {
                  circleClass = "bg-blue-500 text-white shadow-blue-200 shadow-lg animate-pulse";
                  icon = <Clock className="w-5 h-5" />;
                }

                return (
                  <div key={tier.name} className="flex-1 flex flex-row md:flex-col items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${circleClass}`}
                    >
                      {icon}
                    </div>
                    <div className="flex-1 text-center">
                      <p className={`font-medium text-sm ${isActive ? "text-blue-700" : "text-slate-800"}`}>
                        {tier.name}
                      </p>
                      {tier.receiveDate && (
                        <p className="text-xs text-slate-500">
                          Received: {formatSheetDate(tier.receiveDate)}
                        </p>
                      )}
                      {tier.submitDate && (
                        <p className="text-xs text-slate-500">
                          Submitted: {formatSheetDate(tier.submitDate)}
                        </p>
                      )}
                      {isActive && (
                        <p className="text-xs text-blue-600 font-medium mt-0.5">In Progress</p>
                      )}
                      {isPending && !tier.receiveDate && (
                        <p className="text-xs text-slate-400 mt-0.5">Pending</p>
                      )}

                    </div>
                    {!isLast && (
                      <ChevronRight className={`hidden md:block w-5 h-5 self-center shrink-0 transition-colors duration-500 ${
                        isCompleted ? "text-green-400" : "text-slate-300"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Data Collection Form */}
        <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 border-slate-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Submit Fuel Purchase Additional Information</CardTitle>
            <p className="text-sm text-slate-500">All fuel fields are mandatory. Enter 0 if not applicable.</p>
          </CardHeader>
          <CardContent>
            {submitSuccess ? (
              <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in duration-500">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <h3 className="text-xl font-bold text-slate-800">Submitted Successfully!</h3>
                <p className="text-slate-600">Your data has been recorded in the system.</p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => navigate("/")} variant="outline">
                    Back to Search
                  </Button>
                  <Button
                    onClick={() => {
                      setSubmitSuccess(false);
                      setFormData({
                        dieselAg: "",
                        octanePg: "",
                        petrolPg: "",
                        dieselVehicle: "",
                        purchaseSource: "",
                        pumpName: "",
                        amountReturnViaBank: "",
                        remarks: "",
                      });
                    }}
                  >
                    Submit Another
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dieselAg">
                      Diesel-AG (Ltr) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="dieselAg"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={formData.dieselAg}
                      onChange={(e) => setFormData({ ...formData, dieselAg: e.target.value })}
                      onFocus={(e) => e.currentTarget.select()}
                      onBlur={(e) => {
                        if (!e.target.value) setFormData((prev) => ({ ...prev, dieselAg: "0" }));
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                    {formErrors.dieselAg && (
                      <p className="text-xs text-red-500">{formErrors.dieselAg}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="octanePg">
                      Octane-PG (Ltr) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="octanePg"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={formData.octanePg}
                      onChange={(e) => setFormData({ ...formData, octanePg: e.target.value })}
                      onFocus={(e) => e.currentTarget.select()}
                      onBlur={(e) => {
                        if (!e.target.value) setFormData((prev) => ({ ...prev, octanePg: "0" }));
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                    {formErrors.octanePg && (
                      <p className="text-xs text-red-500">{formErrors.octanePg}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="petrolPg">
                      Petrol-PG (Ltr) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="petrolPg"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={formData.petrolPg}
                      onChange={(e) => setFormData({ ...formData, petrolPg: e.target.value })}
                      onFocus={(e) => e.currentTarget.select()}
                      onBlur={(e) => {
                        if (!e.target.value) setFormData((prev) => ({ ...prev, petrolPg: "0" }));
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                    {formErrors.petrolPg && (
                      <p className="text-xs text-red-500">{formErrors.petrolPg}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dieselVehicle">
                      Diesel-Vehicle (Ltr) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="dieselVehicle"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={formData.dieselVehicle}
                      onChange={(e) => setFormData({ ...formData, dieselVehicle: e.target.value })}
                      onFocus={(e) => e.currentTarget.select()}
                      onBlur={(e) => {
                        if (!e.target.value) setFormData((prev) => ({ ...prev, dieselVehicle: "0" }));
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                    {formErrors.dieselVehicle && (
                      <p className="text-xs text-red-500">{formErrors.dieselVehicle}</p>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="purchaseSource">
                    Purchase Source <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.purchaseSource}
                    onValueChange={(value) =>
                      setFormData({ ...formData, purchaseSource: value, pumpName: "" })
                    }
                  >
                    <SelectTrigger id="purchaseSource">
                      <SelectValue placeholder="Select purchase source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash purchase from enlisted pump">
                        Cash purchase from enlisted pump
                      </SelectItem>
                      <SelectItem value="Local Purchase">Local Purchase</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.purchaseSource && (
                    <p className="text-xs text-red-500">{formErrors.purchaseSource}</p>
                  )}
                </div>

                {formData.purchaseSource === "Cash purchase from enlisted pump" && (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <Label htmlFor="pumpName">
                      Pump Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="pumpName"
                      type="text"
                      placeholder="Enter pump name"
                      value={formData.pumpName}
                      onChange={(e) => setFormData({ ...formData, pumpName: e.target.value })}
                    />
                    {formErrors.pumpName && (
                      <p className="text-xs text-red-500">{formErrors.pumpName}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="amountReturnViaBank">
                    Amount Return via Bank <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="amountReturnViaBank"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={formData.amountReturnViaBank}
                    onChange={(e) => setFormData({ ...formData, amountReturnViaBank: e.target.value })}
                    onFocus={(e) => e.currentTarget.select()}
                    onBlur={(e) => {
                      if (!e.target.value) setFormData((prev) => ({ ...prev, amountReturnViaBank: "0" }));
                    }}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                  {formErrors.amountReturnViaBank && (
                    <p className="text-xs text-red-500">{formErrors.amountReturnViaBank}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    placeholder="Enter any additional remarks (optional)"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    rows={3}
                  />
                </div>

                {formErrors.submit && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-red-700">{formErrors.submit}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 transition-colors"
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Submit Data
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
