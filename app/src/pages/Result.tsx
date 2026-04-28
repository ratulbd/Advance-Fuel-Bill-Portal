import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
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
import { ArrowLeft, LogOut, CheckCircle, Clock, AlertCircle, ImageIcon, Send } from "lucide-react";

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
  topSheetImage: string;
  fieldRemarks: string;
  tiers: TierStatus[];
}

export default function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth({ redirectOnUnauthenticated: true });
  const record: RecordData | null = location.state?.data || null;

  const [formData, setFormData] = useState({
    dieselAg: "",
    octanePg: "",
    petrolPg: "",
    dieselVehicle: "",
    purchaseSource: "",
    pumpName: "",
    amountReturnViaBank: "",
    remarks: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitSuccess, setSubmitSuccess] = useState(false);

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
  const typeColor = isFuelBill ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <h1 className="font-bold text-slate-800 text-lg">Tracking Details</h1>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
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
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-xl">Bill Information</CardTitle>
              <Badge className={typeColor}>{typeLabel}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500 uppercase tracking-wider">SL Number</Label>
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
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Bill Submit Amount</Label>
                <p className="font-semibold text-slate-800">{record.billSubmitAmount || "—"}</p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Field Remarks</Label>
                <p className="text-slate-700 bg-slate-50 p-2 rounded-md">{record.fieldRemarks || "—"}</p>
              </div>

              {record.topSheetImage && (
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs text-slate-500 uppercase tracking-wider">Bill Top Sheet</Label>
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="relative group cursor-pointer max-w-xs">
                        <img
                          src={record.topSheetImage}
                          alt="Bill Top Sheet"
                          className="w-full h-32 object-cover rounded-lg border border-slate-200"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <ImageIcon className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <img
                        src={record.topSheetImage}
                        alt="Bill Top Sheet Enlarged"
                        className="w-full max-h-[80vh] object-contain rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Approval Workflow Card */}
        <Card className="shadow-md">
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
                const waiting = !tier.completed && index > 0 && record.tiers[index - 1].completed;

                return (
                  <div key={tier.name} className="flex-1 flex flex-row md:flex-col items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        tier.completed
                          ? "bg-green-500 text-white"
                          : waiting
                          ? "bg-amber-500 text-white"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {tier.completed ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : waiting ? (
                        <Clock className="w-5 h-5" />
                      ) : (
                        <span className="text-sm font-bold">{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-1 text-center">
                      <p className="font-medium text-sm text-slate-800">{tier.name}</p>
                      {tier.receiveDate && (
                        <p className="text-xs text-slate-500">Received: {tier.receiveDate}</p>
                      )}
                      {tier.submitDate && (
                        <p className="text-xs text-slate-500">Submitted: {tier.submitDate}</p>
                      )}
                      {waiting && (
                        <p className="text-xs text-amber-600 font-medium">Waiting for approval</p>
                      )}
                    </div>
                    {!isLast && (
                      <div className="hidden md:block w-8 h-0.5 bg-slate-300 self-center" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Data Collection Form */}
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Fuel & Purchase Information</CardTitle>
            <p className="text-sm text-slate-500">All fuel fields are mandatory. Enter 0 if not applicable.</p>
          </CardHeader>
          <CardContent>
            {submitSuccess ? (
              <div className="text-center py-8 space-y-4">
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
                  <div className="space-y-2">
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
                  className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
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
