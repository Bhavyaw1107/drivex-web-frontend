import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { adminAPI } from "../lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  Files,
  HardDrive,
  FolderOpen,
  RefreshCw,
  AlertCircle,
  Shield,
  Crown,
} from "lucide-react";

const TYPE_COLORS = [
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#6366f1",
  "#14b8a6",
];

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function StatCard({ icon: Icon, label, value, subtext, color }) {
  return (
    <Card className="bg-[#111827] border-gray-800">
      <CardHeader className="pb-2">
        <CardDescription className="text-gray-400">{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-xl"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            {subtext && (
              <p className="text-sm text-gray-400">{subtext}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Admin() {
  const { isLoaded } = useUser();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [promoting, setPromoting] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setAccessDenied(false);
      const [statsRes, usersRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers(),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users || []);
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
      if (err.response?.status === 403) {
        setAccessDenied(true);
      } else {
        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "Failed to load data"
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const promoteToAdmin = async (clerkId) => {
    try {
      setPromoting(clerkId);
      await adminAPI.promoteUser(clerkId);
      setUsers((prev) =>
        prev.map((u) =>
          u.clerkId === clerkId ? { ...u, isAdmin: true } : u
        )
      );
    } catch (err) {
      console.error("Failed to promote user:", err);
      alert(err.response?.data?.error || "Failed to promote user");
    } finally {
      setPromoting(null);
    }
  };

  useEffect(() => {
    if (isLoaded) {
      fetchStats();
    }
  }, [fetchStats, isLoaded]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-16 h-16 text-red-400" />
        <h1 className="text-2xl font-bold text-white">Access Denied</h1>
        <p className="text-gray-400">
          You do not have admin privileges to view this page.
        </p>
        <Button
          onClick={() => (window.location.href = "/dashboard")}
          className="bg-cyan-500 hover:bg-cyan-600 text-white"
        >
          Go to Dashboard
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-16 h-16 text-red-400" />
        <h1 className="text-xl font-bold text-white">Error Loading Data</h1>
        <p className="text-gray-400">{error}</p>
        <Button
          onClick={fetchStats}
          className="bg-cyan-500 hover:bg-cyan-600 text-white"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-gray-200">
      <div className="ml-64 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-400 mt-1">
              Platform overview and statistics
            </p>
          </div>
          <Button
            onClick={fetchStats}
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Users}
            label="Total Users"
            value={stats.totalUsers}
            subtext="registered users"
            color="#06b6d4"
          />
          <StatCard
            icon={Files}
            label="Total Files"
            value={stats.totalFiles}
            subtext="active files"
            color="#8b5cf6"
          />
          <StatCard
            icon={HardDrive}
            label="Total Storage"
            value={formatBytes(stats.totalStorage)}
            subtext="used storage"
            color="#ec4899"
          />
          <StatCard
            icon={FolderOpen}
            label="Total Folders"
            value={stats.totalFolders}
            subtext="active folders"
            color="#10b981"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-[#111827] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Storage Trend (30 Days)</CardTitle>
              <CardDescription className="text-gray-400">
                Daily storage usage over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.storageTrend && stats.storageTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.storageTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis
                      dataKey="date"
                      stroke="#9ca3af"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(val) => {
                        const d = new Date(val);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      tick={{ fontSize: 12 }}
                      tickFormatter={formatBytes}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                      }}
                      labelFormatter={(val) => {
                        const d = new Date(val);
                        return d.toLocaleDateString();
                      }}
                      formatter={(value) => [formatBytes(value), "Storage"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="size"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No storage trend data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#111827] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">
                File Type Distribution
              </CardTitle>
              <CardDescription className="text-gray-400">
                Files by type category
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.fileTypeDistribution &&
              stats.fileTypeDistribution.length > 0 ? (
                <div className="flex items-center gap-8">
                  <ResponsiveContainer width="50%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.fileTypeDistribution}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={60}
                      >
                        {stats.fileTypeDistribution.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              TYPE_COLORS[
                                index % TYPE_COLORS.length
                              ]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                        }}
                        formatter={(value, name) => [
                          value,
                          name || "Unknown",
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2">
                    {stats.fileTypeDistribution.map((item, index) => (
                      <div
                        key={item.type}
                        className="flex items-center gap-2"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              TYPE_COLORS[index % TYPE_COLORS.length],
                          }}
                        />
                        <span className="text-gray-300 capitalize">
                          {item.type || "Other"}
                        </span>
                        <Badge
                          variant="secondary"
                          className="ml-auto bg-gray-800 text-gray-300"
                        >
                          {item.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No file type data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-[#111827] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">User Storage</CardTitle>
              <CardDescription className="text-gray-400">
                Storage usage breakdown by user
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.filesPerUser && stats.filesPerUser.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          User
                        </th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">
                          Files
                        </th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">
                          Storage
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.filesPerUser.map((row) => (
                        <tr
                          key={row.clerkId}
                          className="border-b border-gray-800 hover:bg-gray-800/50"
                        >
                          <td className="py-3 px-4">
                            <div>
                              <p className="text-white font-medium">
                                {row.name || "Unknown"}
                              </p>
                              <p className="text-sm text-gray-400">
                                {row.email || "No email"}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-gray-300">
                            {row.fileCount}
                          </td>
                          <td className="py-3 px-4 text-right text-gray-300">
                            {formatBytes(row.totalSize)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-500">
                  No user data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#111827] border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Manage Users</CardTitle>
              <CardDescription className="text-gray-400">
                Promote users to admin or view all registered users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {users.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                          User
                        </th>
                        <th className="text-center py-3 px-4 text-gray-400 font-medium">
                          Role
                        </th>
                        <th className="text-right py-3 px-4 text-gray-400 font-medium">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr
                          key={u.clerkId}
                          className="border-b border-gray-800 hover:bg-gray-800/50"
                        >
                          <td className="py-3 px-4">
                            <div>
                              <p className="text-white font-medium">
                                {u.name || "Unknown"}
                              </p>
                              <p className="text-sm text-gray-400">
                                {u.email || "No email"}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {u.isAdmin ? (
                              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                                <Crown className="w-3 h-3 mr-1" />
                                Admin
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-gray-800 text-gray-400">
                                User
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {!u.isAdmin && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gray-700 text-gray-300 hover:bg-gray-800"
                                onClick={() => promoteToAdmin(u.clerkId)}
                                disabled={promoting === u.clerkId}
                              >
                                {promoting === u.clerkId ? (
                                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <Shield className="w-3 h-3 mr-1" />
                                )}
                                Make Admin
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-500">
                  No users found. Users will appear after signing in.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Admin;
