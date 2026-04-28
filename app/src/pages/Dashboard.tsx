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
import { Search, LogOut, AlertCircle, CheckCircle } from "lucide-react";

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
        <Card className="max-w-md w-full">
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
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="font-bold text-slate-800 text-lg">BTS Tracking</h1>
          </div>
          <div className="flex items-center gap-3">
            {validation?.valid && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                <CheckCircle className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.avatar || ""} />
                <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                  {user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-slate-600 hidden sm:inline">{user?.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold text-slate-800">Search Tracking Number</CardTitle>
            <p className="text-slate-500 text-sm mt-1">
              Enter a BTS tracking number to view bill details
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter tracking number (SL)..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>

              {searchError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{searchError}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700"
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
                    Search
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="font-semibold text-slate-700 text-sm mb-2">Search Priority</h3>
              <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                <li>Fuel Bill records (Column B)</li>
                <li>Petty Cash records (Column B)</li>
                <li>If not found, a "not found" message will display</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
