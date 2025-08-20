import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const DashboardSkeleton = () => (
  <div className="space-y-4 animate-fade-in">
    {/* Balance Card */}
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-8 w-36" />
        </div>
        <Skeleton className="h-3 w-48 mt-1" />
      </CardContent>
    </Card>

    {/* Income/Expense Cards */}
    <div className="grid grid-cols-2 gap-4">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <Skeleton className="h-4 w-4 mr-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-3 w-12 mt-1" />
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Accounts Widget */}
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Skeleton className="h-4 w-4 mr-1" />  
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-6 w-6" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16 mt-1" />
              </div>
              <div className="flex space-x-1">
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-6 w-6" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

export const AccountsListSkeleton = () => (
  <div className="space-y-4 animate-fade-in">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-9 w-36" />
    </div>
    
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-5 w-5" />
                <div>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24 mt-1" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-6 w-20" />
                <div className="flex flex-col space-y-1">
                  <Skeleton className="h-6 w-6" />
                  <Skeleton className="h-6 w-6" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export const TransactionListSkeleton = () => (
  <div className="space-y-3 animate-fade-in">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-6 w-6 rounded" />
          <div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20 mt-1" />
          </div>
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
    ))}
  </div>
);

export const CardListSkeleton = () => (
  <div className="space-y-3 animate-fade-in">
    {[1, 2, 3].map((i) => (
      <div key={i} className="group">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-1 w-full rounded-full mt-1" />
          </div>
          <div className="flex items-center space-x-2 ml-2">
            <Skeleton className="h-4 w-16" />
            <div className="flex space-x-1">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);