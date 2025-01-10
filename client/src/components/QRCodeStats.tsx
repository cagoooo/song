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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Scan, ChevronUp, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { motion } from "framer-motion";
import { format } from "date-fns";

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

export default function QRCodeStats() {
  const { data: stats } = useQuery<QRCodeScanStats>({
    queryKey: ['/api/qr-scans/stats'],
  });

  if (!stats) return null;

  // Transform date data for the chart
  const chartData = stats.scansByDate.map(item => ({
    date: format(new Date(item.date), 'MM/dd'),
    scans: item.count
  })).reverse();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">總掃描次數</CardTitle>
              <Scan className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalScans}</div>
              <p className="text-xs text-muted-foreground">
                QR Code掃描總次數
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="md:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">掃描趨勢</CardTitle>
              <CardDescription>過去30天的掃描趨勢</CardDescription>
            </CardHeader>
            <CardContent className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
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
                  <Line
                    type="monotone"
                    dataKey="scans"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">熱門歌曲排行</CardTitle>
            <CardDescription>依照QR Code掃描次數排序</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] w-full">
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
