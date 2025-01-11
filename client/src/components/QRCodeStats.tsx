import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Scan, ChevronUp, TrendingUp, BarChart2, Music2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { format, subDays } from "date-fns";
import { useState } from "react";

interface QRCodeScanStats {
  totalScans: number;
  scansBySong: {
    songId: number;
    title: string;
    artist: string;
    scanCount: number;
  }[];
  scansByDate: {
    date: string;
    count: number;
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function QRCodeStats() {
  const [timeRange, setTimeRange] = useState("7");
  const { data: stats } = useQuery<QRCodeScanStats>({
    queryKey: ['/api/qr-scans/stats'],
  });

  if (!stats) return null;

  // Transform date data for the chart
  const chartData = stats.scansByDate
    .map(item => ({
      date: format(new Date(item.date), 'MM/dd'),
      scans: item.count
    }))
    .slice(-parseInt(timeRange))
    .reverse();

  // Calculate trend data
  const totalScansLastPeriod = chartData.reduce((sum, item) => sum + item.scans, 0);
  const averageScansPerDay = totalScansLastPeriod / chartData.length;

  // Prepare pie chart data for top 5 songs
  const pieChartData = stats.scansBySong
    .slice(0, 5)
    .map(song => ({
      name: song.title,
      value: song.scanCount
    }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">數據統計</h2>
        <Select
          value={timeRange}
          onValueChange={setTimeRange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="選擇時間範圍" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">最近 7 天</SelectItem>
            <SelectItem value="14">最近 14 天</SelectItem>
            <SelectItem value="30">最近 30 天</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">總掃描次數</CardTitle>
              <Scan className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalScans}</div>
              <p className="text-xs text-blue-600/80">
                平均每天 {Math.round(averageScansPerDay)} 次掃描
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">熱門歌曲數</CardTitle>
              <Music2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.scansBySong.filter(song => song.scanCount > 0).length}
              </div>
              <p className="text-xs text-green-600/80">
                被掃描過的歌曲總數
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">趨勢分析</CardTitle>
              <BarChart2 className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {totalScansLastPeriod}
              </div>
              <p className="text-xs text-purple-600/80">
                最近 {timeRange} 天的總掃描次數
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">掃描趨勢</CardTitle>
              <CardDescription>每日掃描次數變化</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="scanColorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      fontSize={12}
                      tickMargin={8}
                    />
                    <YAxis 
                      fontSize={12}
                      tickMargin={8}
                    />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="scans"
                      stroke="#8884d8"
                      fillOpacity={1}
                      fill="url(#scanColorGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">熱門歌曲分布</CardTitle>
              <CardDescription>Top 5 最受歡迎的歌曲</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <ScrollArea className="h-[100px]">
                  {pieChartData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 mb-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm">{entry.name}</span>
                    </div>
                  ))}
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">詳細數據</CardTitle>
            <CardDescription>所有歌曲的掃描統計</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">排名</TableHead>
                    <TableHead>歌曲</TableHead>
                    <TableHead>歌手</TableHead>
                    <TableHead className="text-right">掃描次數</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.scansBySong.map((song, index) => (
                    <TableRow key={song.songId}>
                      <TableCell className="font-medium">
                        {index + 1}
                      </TableCell>
                      <TableCell>{song.title}</TableCell>
                      <TableCell>{song.artist}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span>{song.scanCount}</span>
                          {index === 0 && (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}