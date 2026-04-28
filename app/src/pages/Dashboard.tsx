import { useState } from "react";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Search, LogOut, AlertCircle, CheckCircle, Fuel, FileSearch, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [searchValue, setSearchValue] = useState("");
  const [searchError, setSearchError] = useState("");

  const { data: validation, isLoading: validationLoading } = trpc.sheets.validateEmail.useQuery(
    undefined,
    { enabled: !!user, retry: false }
  );

  const searchMutation = trpc.sheets.search.useMutation({
    onSuccess: (data) => {
      if (data.found && data.data) {
        navigate("/result", { state: { data: data.data } });
      } else {
        setSearchError(data.message || "BTS tracking number not found.");
      }
    },
    onError: (error) => {
      setSearchError(error.message || "Search failed. Please try again.");
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError("");
    if (!searchValue.trim()) {
      setSearchError("Please enter a tracking number");
      return;
    }
    searchMutation.mutate({ sl: searchValue.trim() });
  };

  if (authLoading || validationLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (validation && !validation.valid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg border-slate-100">
          <CardHeader className="text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-2" />
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-slate-600">{validation.message}</p>
            <Button onClick={logout} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Fuel className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-lg leading-tight">Telecom Advance Portal</h1>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Fuel &amp; Petty Cash</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {validation?.valid && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50">
                <CheckCircle className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8 ring-2 ring-slate-100">
                <AvatarImage src={user?.avatar || ""} />
                <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                  {user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-slate-600 hidden sm:inline font-medium">{user?.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <FileSearch className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">2</p>
                <p className="text-xs text-slate-500">Record Types</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">4</p>
                <p className="text-xs text-slate-500">Approval Tiers</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-xl border-slate-100 bg-white overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700" />
          <CardHeader className="text-center pb-2 pt-6">
            <div className="mx-auto w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">Search Tracking Number</CardTitle>
            <p className="text-slate-500 text-sm mt-1">
              Enter a BTS tracking number to view bill details and approval status
            </p>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter tracking number (SL)..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-10 h-12 text-lg border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {searchError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 animate-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{searchError}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.01]"
                disabled={searchMutation.isPending}
              >
                {searchMutation.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Search Records
                  </>
                )}
              </Button>
            </form>

            <Separator className="my-5" />

            <div className="space-y-3">
              <h3 className="font-semibold text-slate-700 text-sm">Search Coverage</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-100">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                    <Fuel className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Fuel Bill</p>
                    <p className="text-xs text-slate-500">4-tier workflow</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <FileSearch className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Petty Cash</p>
                    <p className="text-xs text-slate-500">3-tier workflow</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
