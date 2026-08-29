import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Users, ShoppingBag, TrendingUp } from "lucide-react"

export default function AdminDashboard() {
  const stats = [
    { title: "Total Revenue", value: "SAR 12,450", icon: DollarSign, trend: "+12.5%" },
    { title: "Active Orders", value: "24", icon: ShoppingBag, trend: "+5.2%" },
    { title: "Total Customers", value: "1,245", icon: Users, trend: "+18.1%" },
    { title: "Avg. Order Value", value: "SAR 45", icon: TrendingUp, trend: "+2.4%" },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-outfit">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">
                {stat.title}
              </CardTitle>
              <stat.icon className="w-4 h-4 text-primary-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-emerald-500 mt-1">
                {stat.trend} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="bg-white/5 border-white/10 h-[400px] flex items-center justify-center">
          <p className="text-zinc-500">Revenue Chart (Coming Soon)</p>
        </Card>
        <Card className="bg-white/5 border-white/10 h-[400px] flex items-center justify-center">
          <p className="text-zinc-500">Popular Items (Coming Soon)</p>
        </Card>
      </div>
    </div>
  )
}
